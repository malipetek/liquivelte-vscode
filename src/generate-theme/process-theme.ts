import * as vscode from 'vscode';
import toCamelCase from '../utils/to-camel-case';
import getThemeDirectory from '../utils/get-theme-directory';
import fs from 'fs-extra';
import uid from '../utils/uid';

import { rollup } from 'rollup';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import cleancss from 'postcss-discard-duplicates';

// import css from 'rollup-plugin-css-chunks';
import scss from 'rollup-plugin-scss';
import preprocess from 'svelte-preprocess';
import { liquivelteLiquidPlugin, liquivelteSveltePlugin } from '../utils/liquvelte-rollup';
import path from 'path';
import state from '../utils/state';
import debounce from 'debounce-async';
import { fileChangeHandler } from '../utils/state-change-handlers';

const tailwind = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const postcssimport = require('postcss-import');
const tailwindcssNesting = require('tailwindcss/nesting');

const { workspaceFolders } = vscode.workspace;

let themeDirectoryProvided: string = '';

const quoted = /^'[^']*'|"[^"]*"$/;

state.set = { deptree: {}, prebuildDone: false, outputs: {} };

async function generateEntryScript (svelteIncludes: parsedToken[]): Promise<string>
{
  try {
    const includedModules = [];
    svelteIncludes = svelteIncludes.filter(include =>
    {
      if (includedModules.indexOf(include.props.module) === -1) {
        includedModules.push(include.props.module);
        return true;
      }
      if (include.tagName === 'section' && includedModules.indexOf(include.includeName) === -1) {
        includedModules.push(include.includeName);
        return true;
      }
      return false;
    });
    return `
  const onIntersect = (el, callback) => {
    const observer = new IntersectionObserver(callback, {
      root: null,   // default is the viewport
      rootMargin: '100px', // default is '0px'
      threshold: 0 // percentage of taregt's visible area. Triggers "onIntersection"
    });
    observer.observe(el);
  };

  document.addEventListener('DOMContentLoaded', () => {
    ` +
      svelteIncludes.reduce((acc, include) => `${acc}
  Array.from(document.querySelectorAll('.liquivelte-component.${include.props.module || include.includeName}')).forEach(wrapper => {
    let svelteProps = wrapper.svelteProps;
    let rawIncludes = wrapper.rawIncludes;
    let liquid_expression_cache = wrapper.liquid_expression_cache;

    let initialized = false;
    onIntersect(wrapper, ([entry]) => {
      (async () => {
        if(entry.isIntersecting && !initialized) {
          initialized = true;
          new (await import("../${include.tagName === 'section' ? 'sections' : 'snippets'}/${include.isFolder ? `${include.props.module || include.includeName}/index` : include.props.module || include.includeName}.liquivelte")).default({
            target: wrapper,
            hydrate: true,
            props: {
                ...svelteProps,
                ...rawIncludes,
                lec: liquid_expression_cache
            }
          });
        }
      })();
    });
  });
  `, '') + `
  });`;
  } catch (err) {
    throw err;
  }
}

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
    await Promise.all(templates.filter(e => e[1] === 1).map(async template =>
    {
      try {
        console.log('generating template script ', template[0]);
        await generateTemplateScript(template[0], false);
      } catch (err) {
        console.log('error generating template script', err);
      }
    })).catch(err =>
    {
      console.log('error filtering templates', err);
    });

    await Promise.all(layouts.filter(e => e[1] === 1).map(async template =>
    {
      try {
        console.log('generating template script ', template[0]);
        await generateTemplateScript(template[0], true);
      } catch (err) {
        console.log('error generating template script', err);
      }
    })).catch(err =>
    {
      // console.log('error filtering templates', err);
    });
  }
}
async function _generateIncludeScripts ({ themeDirectory })
{
  // await criticalCSSGenerator();

  await Promise.all(Object.keys(state.layouts).map(async layoutname =>
  {
    const layouts = state.layouts;
    const templates = state.templates;
    const layoutContents = state.layoutContents;
    const layout = state.layouts[layoutname];
    const layoutContent = state.layoutContents[layoutname];
    if (!layoutContent) { return; }

    let [beforeComment, afterComment] = layoutContent.split('<!-- liquivelte includes -->');
    let [includeContent, afterInclude] = afterComment.split(/<\!--\s*liquivelte\s*includes\s*end\s*-->/);

    const newContent = `${beforeComment}<!-- liquivelte includes -->
    {% assign templatesWithLiquivelte = '${Object.keys(state.templates)
        .filter(temp => state.templates[temp].hasIncludes).map(temp => temp.replace(/\.[^\.]+$/, '').replace('/', '-')).join(',')}' | split: ',' %}
    {% assign template_with_suffix_and_directory = template %}
    {% if template.directory %}
      {% assign template_with_suffix_and_directory = template.directory | append: '-' | append: template_with_suffix_and_directory %}
      {% endif %}
      {% if template.suffix != blank %}
      {% assign template_with_suffix_and_directory = template_with_suffix_and_directory | append: '.' | template.suffix %}
    {% endif %}
    {% if templatesWithLiquivelte contains template_with_suffix_and_directory %}
      {% assign liquivelte_js_source = template_with_suffix_and_directory | append: '.liquivelte.js' %}
      {% assign liquivelte_nm_js_source = template_with_suffix_and_directory | append: '.nm.liquivelte.js' %}
      {% assign liquivelte_css_source = template_with_suffix_and_directory | append: '.liquivelte.css' %}
      <script type="module" src="{{ liquivelte_js_source | asset_url }}" defer="defer"></script>
      <link rel="stylesheet" rel="preload" as="style" href="{{ liquivelte_css_source | asset_url }}" />
      {% endif %}
      ${layouts[layoutname].hasIncludes ? `
      <script type="module" src="{{ '${layoutname.replace('.liquid', '')}.liquivelte.js' | asset_url }}" defer="defer"></script>
      <link rel="stylesheet" rel="preload" as="style" href="{{ '${layoutname.replace('.liquid', '')}.liquivelte.css' | asset_url }}" />
    ` : ''}
    <script>
    if (!Object.hasOwn(HTMLScriptElement.prototype, 'noModule')) {
			const systemJsLoaderTag = document.createElement('script');
			systemJsLoaderTag.src = 'https://unpkg.com/systemjs@6.2.5/dist/s.js';
			systemJsLoaderTag.addEventListener('load', function () {
				System.import('{{ liquivelte_nm_js_source | asset_url }}');
        ${layouts[layoutname].hasIncludes ? `
				System.import('{{ '${layoutname.replace('.liquid', '')}.nm.liquivelte.js' | asset_url }}');` : ''}
			});
			document.head.appendChild(systemJsLoaderTag);
		}
    </script>
    <!-- liquivelte includes end -->${afterInclude}`;

    // TODO: include fallback scripts for SystemJS
    if (newContent === layoutContent) { return; }
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', layoutname), Buffer.from(newContent));
    return;
  }));
}
const generateIncludeScripts = debounce(_generateIncludeScripts, 500);

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

  const { isTheme, themeDirectory, folders, workspaceFolders } = await getThemeDirectory();
  const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');
  const layoutsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout');

  const template = vscode.Uri.joinPath(isLayout ? layoutsFolder : templatesFolder, templateName);
  state.set = { [templateName]: { loading: false } };

  try {
    const allIncludes = await getAllIncludes(templateName, template, themeDirectory);
    const templateNameRaw = templateName;
    templateName = templateName.replace(/\//, '-');
    // console.log('allIncludes of ', templateName, '==> ', allIncludes.includes.map(e => e.file).join(', '));

    let svelteIncludes = allIncludes.svelteIncludes;
    if (svelteIncludes.length === 0) {
      if (isLayout) {
        state.layouts[templateNameRaw].hasIncludes = false;
      } else {
        state.templates[templateNameRaw].hasIncludes = false;
      }
      return 0;
    }

    if (isLayout) {
      state.layouts[templateNameRaw].hasIncludes = true;
    } else {
      state.templates[templateNameRaw].hasIncludes = true;
    }

    const templateNameWithoutExtension = templateName.replace(/\.(liquid|json)/g, '');
    /*
    * Generate the script for the template
    * generate entry script
    */
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates'));
    const entryPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates', templateNameWithoutExtension + '.js');
    const entryContent = await generateEntryScript(svelteIncludes);
    await vscode.workspace.fs.writeFile(entryPath, Buffer.from(entryContent));

    state['buildErrors'] = [...state['buildErrors'].filter(error => (error.watchFiles || []).every(watchFile => (watchFile || '').indexOf(templateNameWithoutExtension) === -1))];
    state['buildWarnings'] = [...state['buildWarnings'].filter(warning => (warning.watchFiles || []).every(watchFile => (watchFile || '').indexOf(templateNameWithoutExtension) === -1))];

    // see below for details on these options
    const production = !state['watching'];
    const tailwindOptionsSvelte = {
      future: {
        purgeLayersByDefault: true,
        removeDeprecatedGapUtilities: true,
      },
      plugins: [

      ],
      content: [
        vscode.Uri.joinPath(workspaceFolders[0].uri, 'src').fsPath + "/**/*.svelte",

      ],
    };
    const purgePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src').fsPath + "/**/*.liquivelte";
    const tailwindOptionsLiquivelte = {
      future: {
        purgeLayersByDefault: true,
        removeDeprecatedGapUtilities: true,
      },
      plugins: [

      ],
      content: [
        purgePath,
      ]
    };
    const srcRoot = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src');
    // console.log('root ', srcRoot.fsPath);
    const postcssImport = postcssimport({
      root: srcRoot.fsPath,
    });
    const liquiveltePreprocessor = preprocess({
      postcss: {
        plugins: [
          postcssImport,
          tailwindcssNesting,
          tailwind(tailwindOptionsLiquivelte),
          autoprefixer,
          cleancss(),
        ]
      }
    });
    const sveltePreprocessor = preprocess({
      postcss: {
        plugins: [
          postcssImport,
          tailwindcssNesting,
          tailwind(tailwindOptionsSvelte),
          autoprefixer,
          cleancss(),
        ]
      }
    });
    const inputOptions = {
      input: entryPath.fsPath,
      treeshake: false,
      plugins: [
        liquivelteSveltePlugin({
          preprocess: liquiveltePreprocessor,
          emitCss: true
        }),
        svelte({
          preprocess: sveltePreprocessor,
          compilerOptions: {
            hydratable: true,
            css: false,
          },
          emitCss: true
        }),
        // (state['buildConfig'].is_scss ?
        //   scss({ output: `${templateName.replace(/\.[^\.]+$/, '')}.liquivelte.css` }) :
        //   css({ output: `${templateName.replace(/\.[^\.]+$/, '')}.liquivelte.css` })),
        css({ output: `${templateName.replace(/\.[^\.]+$/, '')}.liquivelte.css` }),
        // this doesnt work
        // css({
        //   // inject a CSS `@import` directive for each chunk depended on
        //   injectImports: true,
        //   // name pattern for emitted secondary chunks
        //   chunkFileNames: '[name]-[hash].liquivelte.css',
        //   // name pattern for emitted entry chunks
        //   entryFileNames: '[name].liquivelte.css',
        //   // public base path of the files
        //   publicPath: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets').fsPath,
        //   // generate sourcemap
        //   sourcemap: false,
        //   // emit css/map files
        //   emitFiles: true,
        // }),
        liquivelteLiquidPlugin({
          themePath: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory).fsPath
        }),
        alias({
          entries: [
            { find: 'liquivelte-liquid.js', replacement: path.resolve(srcRoot.fsPath, 'liquivelte-liquid.js') },
          ]
        }),
        resolve({
          browser: true,
          rootDir: srcRoot.fsPath,
        }),
        commonjs(),
        (state['buildConfig'].is_ts &&
          typescript({
            sourceMap: !production,
            inlineSources: !production
          })
        ),
        (production &&
          terser({
            module: true,
            compress: { join_vars: false, collapse_vars: false, dead_code: false, drop_console: true, unused: false },
            mangle: { keep_fnames: true, keep_classnames: true },
            output: { beautify: false, quote_style: 3 },
            parse: {},
          }))
      ],
      onwarn: (warning, warn) =>
      {
        state['buildWarnings'] = [...state['buildWarnings'], warning];
        // console.log('warning ', warning);
        return;
      }
    };
    // you can create multiple outputs from the same input to generate e.g.
    // different formats like CommonJS and ESM
    const outputOptionsList = [{
      sourcemap: false,
      name: 'theme.liquivelte.' + templateName.replace('.liquid', ''),
      format: 'es',
      minifyInternalExports: false,
      dir: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets').fsPath,
      entryFileNames: `[name].liquivelte.js`,
      assetFileNames: `[name]-hs[hash].liquivelte.js`,
      chunkFileNames (file)
      {
        const allContent = Object.keys(file.modules).map(k => file.modules[k].code || '').reduce((a, b) => a + b, '');
        state.outputs[templateName] = [ ...(state.outputs[templateName] || []), `${file.name}-hs${allContent ? uid(allContent) : '000000'}.liquivelte.js`];
        return `[name]-hs${allContent ? uid(allContent) : '000000'}.liquivelte.js`;
      },
      manualChunks (id)
      {
        const parsed = path.parse(id);
        if (/\/sections\/[^\/]+\/.+/.test(id)) {
          return id.match(/\/sections\/([^\/]+)\/.+/)[1];
        }
        if (id.includes('node_modules') && id.includes('svelte')) {
          return 'liquivelte-svelte';
        }
        if (id.includes('liquivelte-liquid')) {
          return 'liquivelte-liquid';
        }
        if (parsed.base.includes('.module')) {
          return parsed.base.replace('.module', '');
        }
      }
    },
    // {
    //   sourcemap: false,
    //   name: 'theme.liquivelte.' + templateName.replace('.liquid', ''),
    //   format: 'system',
    //   dir: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets').fsPath,
    //   entryFileNames: `[name].nm.liquivelte.js`,
    //   assetFileNames: `[name]-hs${buildId}.nm.liquivelte.js`,
    //   chunkFileNames: `[name]-hs${buildId}.nm.liquivelte.js`,
    //   manualChunks (id)
    //   {
    //     if (/\/sections\/[^\/]+\/.+/.test(id)) {
    //       return id.match(/\/sections\/([^\/]+)\/.+/)[1];
    //     }
    //     if (id.includes('node_modules') && id.includes('svelte')) {
    //       return 'liquivelte-svelte';
    //     }
    //     if (id.includes('liquivelte-liquid')) {
    //       return 'liquivelte-liquid';
    //     }
    //   }
    // }
  ];

    state[templateName] = { loading: true };
    // console.log('production ', production);
    state['prebuildDone'] = false;
    console.log('building for ', templateName, state.prebuildDone);
    await build(1);
    state['prebuildDone'] = true;
    console.log('building for ', templateName, state.prebuildDone);
    await build(2);

    state.preprocess_results_cache = new Map;
    state.liquivelte_imports_cache = new Map;
    state.theme_imports_cache = new Map;
    state.main_imports_cache = new Map;

    state[templateName] = { loading: false };

    try {
      await addIncludesAndPrequisities();
      await generateIncludeScripts({ themeDirectory });
    } catch (err) {
      // whatever
    }
    async function build (pass)
    {
      let bundle;
      try {
        // create a bundle
        bundle = await rollup(inputOptions);

        // an array of file names this bundle depends on
        // console.log(bundle.watchFiles);
        state.deptree[templateName] = bundle.watchFiles.filter(e => !e.includes('node_modules'));
        if (pass === 2) {
          await generateOutputs(bundle);
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

      console.log('build done for ', templateName);
    }

    async function generateOutputs (bundle)
    {
      for (const outputOptions of outputOptionsList) {
        const { output } = await bundle.write(outputOptions);
        if (rebuild) {
          deleteOldChunks(templateName, output);
        }
      }
    }
  }
  catch (errorMessage) {
    console.log('Build failed for ', templateName, errorMessage);
    state['buildErrors'] = [...state['buildErrors'], { "frame": `Build failed for ${templateName} for an unknown reason`, "code": "PLUGIN_ERROR", "plugin": "liquivelte", "hook": "generateBundle" }];
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
interface parsedToken
{
  tagName: string;
  includeName: string;
  props: { [key: string]: string };
  isFolder?: boolean;
}
export async function getAllIncludes (templateName: string, firstFile: vscode.Uri, themeDirectoryProvided: string, followIncludes: boolean = true): Promise<{ [key: string]: any, svelteIncludes: parsedToken[] }>
{
  let allIncludes: parsedToken[] = [];
  const parsedFiles = new Map;
  const liquivelteSections = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).map(pair => pair[0]);
  const liquivelteSectionFolders = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).filter(pair => pair[1] == 2).map(pair => pair[0]);

  async function getIncludes (file: vscode.Uri)
  {
    try {
      const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'sections');
      const snippetsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'snippets');
      // console.log('file ', file.path.split('/').pop());
      let templateFile;
      try {
        templateFile = (await vscode.workspace.fs.readFile(file)).toString();
      } catch (err) {
        console.log('include file is not found', file);
      }
      parsedFiles.set(file.fsPath, templateFile);
      if (path.parse(file.path).ext === '.json') {
        const json = JSON.parse(templateFile.toString());
        const sections = Object.keys(json.sections).map(sectionName => json.sections[sectionName].type);
        /*******************************************************
         * IF IT IS A LIQUIVELTE SECTION WE MAKE IT AN INCLUDE *
         *******************************************************/
        let sectionIncludes = sections.filter(section =>
        {
          // @ts-ignore
          return liquivelteSections.indexOf(`${section}.liquivelte`) !== -1 || liquivelteSectionFolders.indexOf(section) !== -1;
        });

        allIncludes = [...allIncludes, ...sectionIncludes.map(section => ({ includeName: section, tagName: 'section', props: {}, isFolder: liquivelteSectionFolders.indexOf(section) !== -1 }))];

        /*********************************************************
         * IF IT IS NOT WE GET ALL SECTIONS AND CONCATENATE THEM *
         *********************************************************/
        templateFile = (await Promise.all(sections.filter(section => sectionIncludes.indexOf(section) === -1 && liquivelteSectionFolders.indexOf(section) === -1).map(async section =>
        {
          let _file = '';
          try {
            if (liquivelteSectionFolders.indexOf(section) !== -1) {
              _file = (await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, section, `index.liquid`))).toString();
            } else {
              _file = (await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, `${section}.liquid`))).toString();
            }
          } catch (err) {
            console.log('include file is not found', section);
          }
          return _file;
        }))).reduce((acc, curr) => acc + curr, '');
      }

      const parsed: parsedToken[] = [];
      (templateFile || '').replace(/\{%-?\s(\w+)[\s\n]['"]([^"']+)['"]?(?:with|,)?([^%]*)-?%\}/gim, (a, tagName, includeName, afterWithOrComma, offset) =>
      {
        let props = {};
        if (tagName === 'include' || tagName === 'render') {
          (afterWithOrComma || '').replace(/(with|,)?[\s\n]*((\w+):\s*['"]([^"']+)['"])/g, (a, withOrComma, exp, key, value) =>
          {
            props[key] = value;
            return '';
          });
        }

        parsed.push({
          tagName,
          includeName,
          props
        });
        return '';
      });
      // @ts-nocheck
      // @ts-ignore
      const includes = parsed
        .filter(block => block.tagName === 'section' || block.tagName === 'include' || block.tagName === 'render');

      // console.log(file.path.split('/').pop(), ' includes ', parsed);
      if (includes.length) {
        allIncludes = [...allIncludes, ...includes];
        await Promise.all(includes.map(async block =>
        {
          const includeUri = vscode.Uri.joinPath(block.tagName === 'section' ? sectionsFolder : snippetsFolder, `${block.includeName}.liquid`);
          // console.log('calling sub include', includeUri.path.split('/').pop());

          if (followIncludes && !parsedFiles.has(includeUri.fsPath)) {
            await getIncludes(includeUri);
          }
        }));
      }
    } catch (err) {
      console.log('error getting includes ', err);
    }
  }

  await getIncludes(firstFile);

  let svelteIncludes = allIncludes.filter(e => e.includeName === 'liquivelte' || (e.tagName === 'section' && (liquivelteSections.includes(`${e.includeName}.liquivelte`) || liquivelteSections.includes(e.includeName))));

  return {
    template: templateName,
    includes: allIncludes,
    liquivelteSections,
    svelteIncludes,
    hasIncludes: !!svelteIncludes.length,
  };
}