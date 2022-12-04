import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';

import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { css } from '../utils/liquvelte-rollup';

// import css from 'rollup-plugin-css-chunks';
import cleancss from 'postcss-discard-duplicates';
import sass from 'sass'; 
// import scss from 'rollup-plugin-scss';
import preprocess from 'svelte-preprocess';
import { liquivelteSveltePlugin, json } from '../utils/liquvelte-rollup';
import uid from '../utils/uid';

const tailwind = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const postcssimport = require('postcss-import');
const tailwindcssNesting = require('tailwindcss/nesting');

import state from '../utils/state';

import getThemeDirectory from '../utils/get-theme-directory';
import { generateTemplateScript, generateLayoutScript } from './generateEntryScript';
import { getAllIncludes } from './getAllInclues';

export async function generateLayoutEntry(layoutName, templateName) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const { themeDirectory } = await getThemeDirectory();
  const layoutsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout');
  const layout = vscode.Uri.joinPath(layoutsFolder, layoutName);
  
  const templateNameRaw = templateName;
  templateName = templateName.replace(/\//, '-');
  const templateNameWithoutExtension = templateName.replace(/\.(liquid|json)/g, '');
  
  const layoutNameRaw = layoutName;
  layoutName = layoutName.replace(/\//, '-');
  const layoutNameWithoutExtension = layoutName.replace(/\.(liquid|json)/g, '');

  /*
  * Generate the script for the template
  * generate entry script
  */
  const allIncludes = await getAllIncludes(layoutName, layout, themeDirectory);
  // console.log('allIncludes of ', templateName, '==> ', allIncludes.includes.map(e => e.file).join(', '));
  let svelteIncludes = allIncludes.svelteIncludes;
  try {
    state.layouts[layoutNameRaw].hasIncludes = svelteIncludes.length !== 0;
  } catch (err) {
    // whatevier
  }


await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.layouts'));
const entryPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.layouts', `${layoutNameWithoutExtension}.${templateNameWithoutExtension}.js`);
const entryContent = await generateLayoutScript(svelteIncludes, templateNameWithoutExtension);
await vscode.workspace.fs.writeFile(entryPath, Buffer.from(entryContent));

return {[`${layoutNameWithoutExtension}.${templateNameWithoutExtension}`]: entryPath.fsPath};
}

export async function generateTemplateEntry (templateName)
{
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const { themeDirectory } = await getThemeDirectory();
    const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');
    const template = vscode.Uri.joinPath(templatesFolder, templateName);
    
    const templateNameRaw = templateName;
    templateName = templateName.replace(/\//, '-');
    const templateNameWithoutExtension = templateName.replace(/\.(liquid|json)/g, '');

    /*
    * Generate the script for the template
    * generate entry script
    */
    const allIncludes = await getAllIncludes(templateName, template, themeDirectory);
    // console.log('allIncludes of ', templateName, '==> ', allIncludes.includes.map(e => e.file).join(', '));
    let svelteIncludes = allIncludes.svelteIncludes;
    try {
      if (svelteIncludes.length === 0) {
          state.templates[templateNameRaw].hasIncludes = false;
          return 0;
      }
      state.templates[templateNameRaw].hasIncludes = true;
    } catch (err) {
      // whatevier
    }


  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates'));
  const entryPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates', templateNameWithoutExtension + '.js');
  const customEntryPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', '.templates', templateNameWithoutExtension + '.js');
  const customEntryExists = fs.existsSync(customEntryPath.fsPath);
  const entryContent = await generateTemplateScript(svelteIncludes);
  await vscode.workspace.fs.writeFile(entryPath, Buffer.from(entryContent));
  
  return {[templateNameWithoutExtension]: customEntryExists ? customEntryPath.fsPath : entryPath.fsPath};
}

export const inputOptions = async () =>
{
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const { isTheme, themeDirectory, folders } = await getThemeDirectory();

  const purgePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src').fsPath + "/**/*.liquivelte";
  const srcRoot = vscode.Uri.joinPath(workspaceFolders[0].uri, 'src');
  // see below for details on these options
  const production = !state.watching;
  let tailwindConfigFromWorkspace = {};
  try {
    const tailwindConfigUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'tailwind.config.js');
    const tailwindConfigFromWorkspaceFile = (await vscode.workspace.fs.readFile(tailwindConfigUri)).toString();
    if (tailwindConfigFromWorkspaceFile) {
      tailwindConfigFromWorkspace = (await import(tailwindConfigUri.fsPath)).default;
    }
  } catch (err) {
    vscode.window.showWarningMessage('Could not import tailwind.config.js' + `
    ${err.message}`);
  }

  const tailwindOptionsSvelte = {
    ...tailwindConfigFromWorkspace,
    future: {
      purgeLayersByDefault: true,
      removeDeprecatedGapUtilities: true,
    },
    content: [
      vscode.Uri.joinPath(workspaceFolders[0].uri, 'src').fsPath + "/**/*.svelte",
  
    ],
  };
  
  const tailwindOptionsLiquivelte = {
    ...tailwindConfigFromWorkspace,
    future: {
      purgeLayersByDefault: true,
      removeDeprecatedGapUtilities: true,
    },
    content: [
      purgePath,
    ]
  };
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

  return {
  input: 'will be set later',
  treeshake: false,
    plugins: [
      liquivelteSveltePlugin({
        themeDirectory: path.join(workspaceFolders[0].uri.fsPath, themeDirectory),
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
    css({}),
    alias({
      entries: [
        { find: 'liquivelte-liquid.js', replacement: path.resolve(srcRoot.fsPath, 'liquivelte-liquid.js') },
      ]
    }),
    resolve({
      browser: true,
      rootDir: srcRoot.fsPath,
    }),
    json({}),
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
};
export const outputOptionsList = async () =>
{
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const { isTheme, themeDirectory, folders } = await getThemeDirectory();

  return [{
    sourcemap: false,
    name: 'theme.liquivelte.[name]',
    format: 'es',
    minifyInternalExports: false,
    dir: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets').fsPath,
    entryFileNames: `[name].liquivelte.js`,
    assetFileNames: `[name]-hs[hash].liquivelte.js`,
    chunkFileNames (file)
    {
      const allContent = Object.keys(file.modules).map(k => file.modules[k].code || '').reduce((a, b) => a + b, '');
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
};