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
import { generateTemplateEntry, outputOptionsList, inputOptions } from './generateRollupConfig';
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

  async function doBuildAllTemplateOutputs ()
  {
    let input = {};
    for (let template of templates.filter(e => e[1] === 1)) {
      const inputEntry = await generateTemplateEntry(template[0], false);
  
      input = {
        ...input,
        ...(inputEntry || {})
      };
    }
    for (let template of layouts.filter(e => e[1] === 1)) {
      const inputEntry = await generateTemplateEntry(template[0], true);
  
      input = {
        ...input,
        ...(inputEntry || {})
      };
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

    await build({
      ...inputOpts,
      input,
    }, (await outputOptionsList()), 1);

    if (state.watching && !state.watcher) {
      await startWatch({
        ...inputOpts,
        input,
      }, (await outputOptionsList()), 2);
    } else {
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
      await generateOutputs({bundle, outputOptionsList});
    }
  } catch (error) {
    // do some error reporting
    state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify(error))];
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
        // state.templates
        Object.keys(event.input).map(k => event.input[k]).filter(f => /\.templates\/.+\.js/.test(f)).map(f => f.match(/\.templates\/(.+)\.js/)[1]).forEach(templateName =>
        {
          const templateFound = Object.keys(state.templates).find(f => f.replace(/\.liquid|\.json/, '') === templateName);
          if (templateFound) {
            state.templates[templateFound].loading = true;
          }
          const layoutFound = Object.keys(state.layouts).find(f => f.replace(/\.liquid|\.json/, '') === templateName);
          if (layoutFound) {
            state.layouts[layoutFound].loading = true;
          }
        });
      }
      if (event.code == 'BUNDLE_END') {
        // state.templates
        // console.log('template ended', event);
        Object.keys(event.input).map(k => event.input[k]).filter(f => /\.templates\/.+\.js/.test(f)).map(f => f.match(/\.templates\/(.+)\.js/)[1]).forEach(templateName =>
          {
            const templateFound = Object.keys(state.templates).find(f => f.replace(/\.liquid|\.json/, '') === templateName);
            if (templateFound) {
              state.templates[templateFound].loading = true;
            }
            const layoutFound = Object.keys(state.layouts).find(f => f.replace(/\.liquid|\.json/, '') === templateName);
            if (layoutFound) {
              state.layouts[layoutFound].loading = true;
            }
          });
        // event.result.write();
      }
      if (event.code == 'ERROR') { 
        state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify(event.error))];
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
    state.buildErrors = [...state.buildErrors, JSON.parse(JSON.stringify(error))];
    // console.error('build error', error);
  }

}

function deleteOldChunks (temlateName, output)
{
  try {
    const files = fs.readdirSync(`${vscode.Uri.joinPath(workspaceFolders[0].uri, state.themeDirectory).fsPath}/assets/`);
    const chunkFiles = [...output].filter(f => f.type === 'chunk');

    const moduleFiles = files.filter(file => /-hs([^\.]+)\./.test(file) && state.outputs[temlateName].includes(file));
    const noModuleFiles = files.filter(file => /-hs([^\.]+)\./.test(file) && state.outputs[temlateName].includes(file));
    
    // TODO: Deleting old chunks is deleting shared chunks with multiple builds
      chunkFiles.forEach(chunkFile =>
      {
        const fileName = chunkFile.fileName;
        if (!/-hs([^\.]+)\./.test(chunkFile.fileName)) return;
        
        const [, currentFileName, currentId] = fileName.match(/(.+)-hs([^\.]+)\./);
        if (currentId === '000000') return;
        if (/\.nm/.test(chunkFile.fileName)) {
          noModuleFiles.forEach(file =>
          {
            if (!/-hs([^\.]+)\./.test(file) || !/\.nm/.test(file)) return;
            const [, fileName, id] = file.match(/(.+)-hs([^\.]+)\./);
            if (fileName == currentFileName && id != currentId) {
              fs.unlinkSync(`${vscode.Uri.joinPath(workspaceFolders[0].uri, state.themeDirectory).fsPath}/assets/${file}`);
            }
          });
        } else {
          moduleFiles.forEach(file =>
          {
            if (!/-hs([^\.]+)\./.test(file) || /\.nm/.test(file)) return;
            const [, fileName, id] = file.match(/(.+)-hs([^\.]+)\./);
            if (fileName == currentFileName && id != currentId) {
              fs.unlinkSync(`${vscode.Uri.joinPath(workspaceFolders[0].uri, state.themeDirectory).fsPath}/assets/${file}`);
            }
          });
        }
      
        //     // if (file.indexOf(`${fileName}-hs`) !== -1 && file !== currentFileName) {
        //     //   console.log('will delete 1', file);
        //     //   try {
        //     //     fs.unlinkSync(`${opts.dir}/${file}`);
        //     //   } catch (e) {
        //     //     // whatever
        //     //   }
        //     // }
      });

    // nomoduleFiles.forEach(file =>
    // {
    //   chunkFiles.forEach(chunkFile =>
    //   {
    //     // convert file path to file name
    //     if (!chunkFile.facadeModuleId) return;
    //     const fileName = path.parse(chunkFile.facadeModuleId).name;
    //     const currentFileName = chunkFile.fileName;
    //     if (currentFileName.indexOf('nomodule') === -1) { return; }

    //     if (file.indexOf(`${fileName}-hs`) !== -1 && file !== currentFileName) {
    //       console.log('will delete 2', file);
    //       try {
    //         fs.unlinkSync(`${opts.dir}/${file}`);
    //       } catch (e) {
    //         // whatever
    //       }
    //     }
    //   });
    // });
  } catch (e) {
    console.error(e);
  }
}
