import * as vscode from 'vscode';
import getThemeDirectory from '../utils/get-theme-directory';
import fs from 'fs-extra';
import chokidar from 'chokidar';

import { rollup, watch } from 'rollup';


// import css from 'rollup-plugin-css-chunks';
import path from 'path';
import state from '../utils/state';
import debounce from 'debounce-async';

import { generateSectionScript, generateAllSectionsScript } from './generateEntryScript';
import { generateTemplateEntry, generateLayoutEntry, generateCombinedEntry, outputOptionsList, inputOptions } from './generateRollupConfig';
import { generateIncludeScripts } from './generateIncludes';
import { sendStats } from '../sidebar/sidebar-provider';
const { workspaceFolders } = vscode.workspace;

const quoted = /^'[^']*'|"[^"]*"$/;

state.set = { deptree: {}, prebuildDone: false, outputs: {} };


export async function generateAllScripts ()
{
  const { isTheme, themeDirectory, folders, workspaceFolders } = await getThemeDirectory();
  if (!isTheme || !themeDirectory) { return; }
  let templates = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates'));
  const layouts = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout'));
  const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');
  // @ts-ignore
  templates = await Promise.all(templates.map(async template => template[1] === 2 ? (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates', template[0]))).map(file => [`${template[0]}/${file[0]}`, file[1]]) : template));
  // flatten array
  templates = templates.reduce((acc, val) => Array.isArray(val[0]) ? [...acc, ...val] : [...acc, val], []);

  state['buildErrors'] = [];
  state['buildWarnings'] = [];

  await doBuildAllTemplateOutputs();
  function deleteUnusedTemplateEntries (input)
  {
    try {
      const templateFiles =fs.readdirSync(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates').fsPath);
      const sectionFiles = fs.readdirSync(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.sections').fsPath);
      const currentInputs = Object.keys(input).map(k => input[k]).map(entry => [...entry.match(/([^\/]+)\/([^\/]+)\.js$/)].slice(1));
      templateFiles.forEach(file =>
      {
        if (currentInputs.filter(([location, filename]) => location === '.templates').map(([, filename]) => `${filename}.js`).indexOf(file) < 0) {
          // should remove 
          fs.unlinkSync(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates', file).fsPath);
        }
      });
      sectionFiles.forEach(file =>
      {
        if (currentInputs.filter(([location, filename]) => location === '.sections').map(([, filename]) => `${filename}.js`).indexOf(file) < 0) {
          // should remove 
          fs.unlinkSync(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.sections', file).fsPath);
        }
      });
    } catch (e) {
      console.warn('could not get folder for deletition ', e);
    }
  }
  async function doBuildAllTemplateOutputs ()
  {
    
    let input = {};
    // @ts-ignore
    templates = (await Promise.all(templates.filter(e => e[1] === 1).map(e => e[0]).map(async templ => (await generateTemplateEntry(templ) ? templ : 0)))).filter(e => !!e);
    for (let layout of layouts.filter(e => e[1] === 1)) {
      await generateLayoutEntry(layout[0]);
      for (let template of templates) { 
        const inputEntry = await generateCombinedEntry(layout[0], template);
        
              input = {
                ...input,
                ...(inputEntry || {})
              };
      }
    }
    
    
    const liquivelteSections = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).map(pair => pair[0]);
    for (let section of liquivelteSections) {
      let isFolder = section.indexOf('.liquivelte') === -1;
      section = section.replace('.liquivelte', '');
      const sectionEntryContent = await generateSectionScript(section, isFolder);
      const sectionEntryPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.sections',  section + '.js');
      await vscode.workspace.fs.writeFile(sectionEntryPath, Buffer.from(sectionEntryContent));
      input = {
        ...input,
        [section]: sectionEntryPath.fsPath
      };
    }

    // deleteUnusedTemplateEntries(input);

    const allSectionsLoaderContent = await generateAllSectionsScript(liquivelteSections);
    const allSectionsLoaderPath = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets',  'liquivelte-sections-loader.js.liquid');
    await vscode.workspace.fs.writeFile(allSectionsLoaderPath, Buffer.from(allSectionsLoaderContent));

    state.preprocess_results_cache = new Map;
    state.liquivelte_imports_cache = new Map;
    state.theme_imports_cache = new Map;
    state.main_imports_cache = new Map;

    const inputOpts = await inputOptions();

    for (let templateName of templates.filter(e => e[1] === 1)) {
      state.templates[templateName[0]] = { loading: true };
    }

    for (let layoutName of layouts.filter(e => e[1] === 1)) {
      state.layouts[layoutName[0]] = { loading: true };
    }

    // input = {
    //   ...input,
    //   "sw": vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'src', 'sw', 'sw.js').fsPath
    // };

    if (state.watching && !state.watcher) {
      await startWatch({
        ...inputOpts,
        input,
      }, (await outputOptionsList()), 2);
    } else {
      deleteHashedFiles();
      await build({
        ...inputOpts,
        input,
      }, (await outputOptionsList()), 2);

      for (let templateName of templates.filter(e => e[1] === 1)) {
        state.templates[templateName[0]] = { loading: false };
      }
  
      for (let layoutName of layouts.filter(e => e[1] === 1)) {
        state.layouts[layoutName[0]] = { loading: false };
      }
      
    }
    // state[templateName] = { loading: false };

    try {
      await addIncludesAndPrequisities();
      await generateIncludeScripts({ themeDirectory });
    } catch (err) {
      // whatever
    }
  }
}

export async function _addIncludesAndPrequisities ()
{
  let themeDirectory = state['themeDirectory'];
  let srcFolder = state['srcFolder'];

  let layoutsArr = state['layoutsArr'];
  let snippets = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'snippets'))).map(snippet => snippet[0]);

  if (!snippets.includes('liquivelte.liquid')) {
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'snippets', 'liquivelte.liquid'), Buffer.from(
` {% comment %}
    Liquivelte: please do not modify.
{% endcomment %}
{% include module with svelte_enum: included_times %}
`));
  }
  await Promise.all(layoutsArr.map(async layout =>
  {
    let layoutContent = (await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', layout[0]))).toString();
    if (layoutContent.indexOf('<!-- liquivelte includes -->') === -1) {
      layoutContent = layoutContent.replace(/\s+\{\{\s*content_for_header\s*\}\}/gi, (a) => `
<!-- liquivelte includes -->
<!-- liquivelte includes end -->
${a}`);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', layout[0]), Buffer.from(layoutContent));
    }
    state.layoutContents[layout[0]] = layoutContent;
  }));
}

const addIncludesAndPrequisities = debounce(_addIncludesAndPrequisities, 500);

export async function generateTemplateScript (templateName: string, isLayout: boolean, rebuild?: boolean)
{
  const { themeDirectory, workspaceFolders } = await getThemeDirectory();
  const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');
  const layoutsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout');

  const template = vscode.Uri.joinPath(isLayout ? layoutsFolder : templatesFolder, templateName);
  state.set = { [templateName]: { loading: false } };

  try{

    const templateNameWithoutExtension = templateName.replace(/\.(liquid|json)/g, '');

    state['buildErrors'] = [...state['buildErrors'].filter(error => (error.watchFiles || []).every(watchFile => (watchFile || '').indexOf(templateNameWithoutExtension) === -1))];
    state['buildWarnings'] = [...state['buildWarnings'].filter(warning => (warning.watchFiles || []).every(watchFile => (watchFile || '').indexOf(templateNameWithoutExtension) === -1))];


    state[templateName] = { loading: true };
    // console.log('production ', production);
    state['prebuildDone'] = false;
    // console.log('building for ', templateName, state.prebuildDone);
    // await build(1);
    state['prebuildDone'] = true;
    // console.log('building for ', templateName, state.prebuildDone);
    // await build(2);

  }
  catch (errorMessage) {
    console.log('Build failed for ', templateName, errorMessage);
    state['buildErrors'] = [...state['buildErrors'], { "frame": `Build failed for ${templateName} for an unknown reason`, "code": "PLUGIN_ERROR", "plugin": "liquivelte", "hook": "generateBundle" }];
  }
}

async function generateOutputs ({ bundle, outputOptionsList})
{
  for (const outputOptions of outputOptionsList) {
    const { output } = await bundle.write(outputOptions);
  }
}

async function build (inputs, outputOptionsList, pass)
{
  let bundle;
  try {
    // create a bundle
    bundle = await rollup(inputs);

    if (pass === 2) {
      sendStats();
      await generateOutputs({bundle, outputOptionsList});
    }
  } catch (error) {
    // do some error reporting
    state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify({...error, message: error.message, stack: error.stack}))];
    // console.error('build error', error);
  }
  if (bundle) {
    // closes the bundle
    await bundle.close();
  }

}

async function startWatch (inputs, outputOptionsList, pass)
{
  let watcher;
  try {
    // create a bundle
    watcher = watch({
      ...inputs,
      output: outputOptionsList,
      watch: {
        buildDelay: 1000,
        chokidar,
        clearScreen: true,
        skipWrite: false,
      }
    });
    watcher.on('event', async event =>
    {
      if (event.code == 'BUNDLE_START') {
        state['buildErrors'] = [];
        state['buildWarnings'] = [];

        // state.templates
        Object.keys(event.input).map(k => event.input[k]).filter(f => /\.(entries|sections)\/.+\.js/.test(f)).map(f => f.match(/\.(entries|sections)\/(.+)\.js/)[2]).forEach(entryName =>
        {
          const [template, layout] = entryName.split('.');
          const templateFound = Object.keys(state.templates).find(f => f.replace(/\.liquid|\.json/, '') === template);
          if (templateFound) {
            state.templates[templateFound].loading = true;
          }
          const layoutFound = Object.keys(state.layouts).find(f => f.replace(/\.liquid|\.json/, '') === layout);
          if (layoutFound) {
            state.layouts[layoutFound].loading = true;
          }
        });
      }
      if (event.code == 'BUNDLE_END') {
        // state.templates
        // console.log('template ended', event);
        Object.keys(event.input).map(k => event.input[k]).filter(f => /\.templates\/.+\.js/.test(f)).map(f => f.match(/\.templates\/(.+)\.js/)[1]).forEach(entryName =>
          {
            const [template, layout] = entryName.split('.');
            const templateFound = Object.keys(state.templates).find(f => f.replace(/\.liquid|\.json/, '') === template);
            if (templateFound) {
              state.templates[templateFound].loading = false;
            }
            const layoutFound = Object.keys(state.layouts).find(f => f.replace(/\.liquid|\.json/, '') === layout);
            if (layoutFound) {
              state.layouts[layoutFound].loading = false;
            }
          });
        // event.result.write();
      }
      if (event.code == 'ERROR') { 
        state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify({...event.error, message: event.error.message, stack: event.error.stack}))];
      }
      if (event.result) {
        event.result.close();
      }
      sendStats();
    });
    
    state.watcher = watcher;
    // if (pass === 2) {
    //   await generateOutputs({bundle, outputOptionsList});
    // }
  } catch (error) {
    // do some error reporting
    state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify({...error, message: error.message, stack: error.stack}))];
    // console.error('build error', error);
  }

}

function deleteHashedFiles ()
{
  try {
    const files = fs.readdirSync(`${vscode.Uri.joinPath(workspaceFolders[0].uri, state.themeDirectory).fsPath}/assets/`);

    const moduleFiles = files.filter(file => /-hs([^\.]+)\./.test(file));
    
    moduleFiles.forEach(file =>
    {
      fs.unlinkSync(`${vscode.Uri.joinPath(workspaceFolders[0].uri, state.themeDirectory).fsPath}/assets/${file}`);
    });

  } catch (e) {
    console.error(e);
  }
}
