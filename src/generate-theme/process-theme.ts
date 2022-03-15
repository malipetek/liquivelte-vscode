import { Liquid, LiquidError, TagToken, Context, Emitter, TopLevelToken, Template } from 'liquidjs';
const liquidEngine = new Liquid();
import * as vscode from 'vscode';
import toCamelCase from '../utils/to-camel-case';
import getThemeDirectory from '../utils/get-theme-directory';

import { rollup } from 'rollup';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import scss from 'rollup-plugin-scss';
import preprocess from 'svelte-preprocess';
import { liquivelteLiquidPlugin, liquivelteSveltePlugin } from '../utils/liquvelte-rollup';
import path from 'path';
import state from '../utils/state';
import debounce from 'debounce-async';

const { workspaceFolders } = vscode.workspace;

let themeDirectoryProvided: string = '';

const quoted = /^'[^']*'|"[^"]*"$/;

state.set = { deptree: {}, prebuildDone: false};

liquidEngine.registerTag('section', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'sections');

    let name;
    if (quoted.exec(this.namestr)) {
      const template = this.namestr.slice(1, -1);
      name = await this.liquid.parseAndRender(template, ctx.getAll(), ctx.opts);
    }
    if (!name) { throw new Error(`cannot include with empty filename`); }

    const filepath = vscode.Uri.joinPath(sectionsFolder, name);
    const templates = await vscode.workspace.fs.readFile(filepath);
    const parsed = await liquidEngine.parse(templates.toString());
    return this.liquid.render(parsed);
  }
});

const include = liquidEngine.tags.get('include')
const include_parse = include.parse;
// @ts-ignore
const include_parseFilePath = include.parseFilePath;
// @ts-ignore
const include_renderFilePath = include.renderFilePath;
const include_render = include.render;

// @ts-ignore
include.parseFilePath = function (tokenizer, liquid)
{
  // console.log('parseFilePath ', tokenizer.input);
  if (/module\s/.test(tokenizer.input)) {
    return 'dummy';
  }
  return include_parseFilePath.apply(this, arguments);
};

liquidEngine.registerTag('paginate', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});
liquidEngine.registerTag('endpaginate', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('form', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endform', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('schema', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endschema', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('layout', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('style', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endstyle', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('javascript', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endjavascript', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

async function generateEntryScript (svelteIncludes: parsedToken[]): Promise<string>
{
  const includedModules = [];
  svelteIncludes = svelteIncludes.filter(include =>
  {
    if (includedModules.indexOf(include.props.module) === -1) {
      includedModules.push(include.props.module);
      return true;
    }
    return false;
  })
  return svelteIncludes.reduce((acc, include) => `${acc}import ${toCamelCase(include.props.module)} from '../${include.tagName === 'section' ? 'sections' : 'snippets'}/${include.props.module}.liquivelte';
`, '') + `
document.addEventListener('DOMContentLoaded', () => {
  ` +
    svelteIncludes.reduce((acc, include) => `${acc}
Array.from(document.querySelectorAll('.liquivelte-component.${include.props.module}')).forEach(wrapper => {
  let svelteProps = wrapper.svelteProps;
  let rawIncludes = wrapper.rawIncludes;

  new ${toCamelCase(include.props.module)}({
    target: wrapper,
    hydrate: true,
    props: {
        ...svelteProps,
        ...rawIncludes
    }
  });
});
`, '') + `
});`;
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
        await generateTemplateScript(template[0], true);
      } catch (err) {
        console.log('error generating template script', err);
      }
    })).catch(err =>
    {
      console.log('error filtering templates', err);
    });
  }
}
async function _generateIncludeScripts ({themeDirectory})
{
  await Promise.all(Object.keys(state.layouts).map(async layoutname =>
    {
    const layouts = state.layouts;
    const templates = state.templates;
    const layoutContents = state.layoutContents;
    const layout = state.layouts[layoutname];
    const layoutContent = state.layoutContents[layoutname];
    if(!layoutContent) { return; }
    
    let [beforeComment, afterComment] = layoutContent.split('<!-- liquivelte includes -->');
    let [includeContent, afterInclude] = afterComment.split(/<\!--\s*liquivelte\s*includes\s*end\s*-->/);

    const newContent = `${beforeComment}<!-- liquivelte includes -->
    {% assign templatesWithLiquivelte = '${
      Object.keys(state.templates)
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
      {% assign liquivelte_css_source = template_with_suffix_and_directory | append: '.liquivelte.css' %}
      <script src="{{ liquivelte_js_source | asset_url }}" defer="defer"></script>
      <link rel="stylesheet" href="{{ liquivelte_css_source | asset_url }}" />
      {% endif %}
      ${layouts[layoutname].hasIncludes ? `
      <script src="{{ '${layoutname}.liquivelte.js' | asset_url }}" defer="defer"></script>
      <link rel="stylesheet" href="{{ '${layoutname}.liquivelte.css' | asset_url }}" />
    ` : ''}
    <!-- liquivelte includes end -->${afterInclude}`;

    if (newContent === layoutContent) { return; }
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', layoutname), Buffer.from(newContent));
    return;
  }));
} 
const generateIncludeScripts = debounce(_generateIncludeScripts, 500);

export async function generateTemplateScript (templateName: string, isLayout: boolean)
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
  
    // see below for details on these options
    const production = state['buildConfig'].minify;
      const inputOptions = {
        input: entryPath.fsPath,
        plugins: [
          liquivelteSveltePlugin({
            preprocess: preprocess(),
            emitCss: true
          }),
          svelte({
            preprocess: preprocess(),
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
          liquivelteLiquidPlugin({
            themePath: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory).fsPath,
          }),
          resolve({
            browser: true,
          }),
          commonjs(),
          (state['buildConfig'].is_ts &&
            typescript({
              sourceMap: !production,
              inlineSources: !production
            })  
          ),
          (!state['watching'] &&
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
          console.log('warning ', warning);
          return;
        }
      };
  
      // you can create multiple outputs from the same input to generate e.g.
      // different formats like CommonJS and ESM
      const outputOptionsList = [{
        sourcemap: false,
        name: 'theme.liquivelte.' + templateName.replace('.liquid', ''),
        format: 'iife',
        file: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'assets', `${templateName.replace(/\.[^\.]+$/, '')}.liquivelte.js`).fsPath,
      }];

      state[templateName] = { loading: true };
      
      state['prebuildDone'] = false;
      await build();
      state['prebuildDone'] = true;
      await build();
      
      state.preprocess_results_cache = new Map;
      state.liquivelte_imports_cache = new Map;
      state.theme_imports_cache = new Map;
      state.main_imports_cache = new Map;
  
      state[templateName] = { loading: false };
    
      await generateIncludeScripts({themeDirectory});
      
      async function build ()
      {
        let bundle;
        let buildFailed = false;
        try {
          // create a bundle
          bundle = await rollup(inputOptions);
  
          // an array of file names this bundle depends on
          // console.log(bundle.watchFiles);
          state['deptree'][templateName] = bundle.watchFiles.filter(e => !e.includes('node_modules'));

          await generateOutputs(bundle);
        } catch (error) {
          buildFailed = true;
          // do some error reporting
          state['buildErrors'] = [...state['buildErrors'], JSON.parse(JSON.stringify(error))];
          // console.error('build error', error);
        }
        if (bundle) {
          // closes the bundle
          await bundle.close();
        }
        // process.exit(buildFailed ? 1 : 0);
      }
  
      async function generateOutputs (bundle)
      {
        for (const outputOptions of outputOptionsList) {
          const { output } = await bundle.write(outputOptions);
  
          for (const chunkOrAsset of output) {
            if (chunkOrAsset.type === 'asset') {
          
              console.log('Asset', chunkOrAsset);
            } else {
            
              console.log('Chunk', chunkOrAsset);
            }
          }
        }
      }
    }
    catch (error) {
      console.log('Build failed for ', templateName, error);
    }
}
interface parsedToken
{
  tagName: string;
  includeName: string;
  props: { [key: string]: string };
}
export async function getAllIncludes (templateName: string, firstFile: vscode.Uri, themeDirectoryProvided: string, followIncludes: boolean = true): Promise<{ [key: string]: any, svelteIncludes: parsedToken[] }>
{
    let allIncludes: parsedToken[] = [];
    const parsedFiles = new Map;
    const liquivelteSections = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).map(pair => pair[0]);
    async function getIncludes (file: vscode.Uri)
    {
      try {
        const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'sections');
        const snippetsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'snippets');
        // console.log('file ', file.path.split('/').pop());
        let templateFile = (await vscode.workspace.fs.readFile(file)).toString();
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
            return liquivelteSections.indexOf(`${section}.liquivelte`) !== -1;
          });

          allIncludes = [...allIncludes, ...sectionIncludes.map(section => ({ includeName: section, tagName: 'section', props: {} }))];

          /*********************************************************
           * IF IT IS NOT WE GET ALL SECTIONS AND CONCATENATE THEM *
           *********************************************************/
          templateFile = (await Promise.all(sections.filter(section => sectionIncludes.indexOf(section) === -1).map(async section =>
          {
            return await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, `${section}.liquid`));
          }))).reduce((acc, curr) => acc + curr.toString(), '');
        }

        const parsed: parsedToken[] = [];
        templateFile.replace(/\{%-?\s(\w+)[\s\n]['"]([^"']+)['"]?(?:with|,)?([^%]*)-?%\}/gim, (a, tagName, includeName, afterWithOrComma, offset) =>
        {
          if (tagName === 'include' || tagName === 'render') {
            let props = {};
            afterWithOrComma.replace(/(with|,)?[\s\n]*((\w+):\s*['"]([^"']+)['"])/g, (a, withOrComma, exp, key, value) =>
            {
              props[key] = value;
              return '';
            });
            parsed.push({
              tagName,
              includeName,
              props
            });
          }
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
  
    let svelteIncludes = allIncludes.filter(e => e.includeName === 'liquivelte' || (e.tagName === 'section' && liquivelteSections.includes(`${e.includeName}.liquivelte`)));

    return {
      template: templateName,
      includes: allIncludes,
      liquivelteSections,
      svelteIncludes,
      hasIncludes: !!svelteIncludes.length,
    };
}