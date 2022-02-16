import { Liquid, LiquidError, TagToken, Context, Emitter, TopLevelToken, Template } from 'liquidjs';
import { src_url_equal } from 'svelte/internal';
const liquidEngine = new Liquid();
import * as vscode from 'vscode';
import toCamelCase from '../utils/to-camel-case';
import getThemeDirectory from '../utils/get-theme-directory';

import { rollup } from 'rollup';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import { liquivelteLiquidPlugin, liquivelteSveltePlugin } from '../utils/liquvelte-rollup';
import path from 'path';
import state from '../utils/state';

const { workspaceFolders } = vscode.workspace;

let themeDirectoryProvided: string = '';

const quoted = /^'[^']*'|"[^"]*"$/;

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
// include.parse = function (tag, args)
// {
//   // console.log('include parsing ', /module\s/.test(tag.args) ? tag.args : '');
//   if (/module\s/.test(tag.args)) {
//     return false;
//   }
//   return include_parse.apply(this, arguments);
// }

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

async function generateEntryScript (svelteIncludes): Promise<string>
{
  const includedModules = [];
  svelteIncludes = svelteIncludes.filter(include =>
  {
    if (includedModules.indexOf(include.module) === -1) {
      includedModules.push(include.module);
      return true;
    }
    return false;
  })
  return svelteIncludes.reduce((acc, include) => `${acc}import ${toCamelCase(include.module)} from '../snippets/${include.module}.liquivelte';
`, '') + `
document.addEventListener('DOMContentLoaded', () => {
  ` +
    svelteIncludes.reduce((acc, include) => `${acc}
Array.from(document.querySelectorAll('.liquivelte-component.${include.module}')).forEach(wrapper => {
  let svelteProps = wrapper.svelteProps;
  let rawIncludes = wrapper.rawIncludes;

  new ${toCamelCase(include.module)}({
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
  const templates = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates'));
  const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');

  await Promise.all(templates.filter(e => e[1] === 1).map(async template =>
  {
    try {
      await generateTemplateScript(vscode.Uri.joinPath(templatesFolder, template[0]), template[0], themeDirectory);
    } catch (err) {
      throw err;
    }
  })).catch(err =>
  {
    throw err;
  });
}

export async function generateTemplateScript (template: vscode.Uri, templateName: string, themeDirectoryProvided: string)
{
  state.set = { [templateName]: { loading: false } };

  try {
    const allIncludes = await getAllIncludes(templateName, template, themeDirectoryProvided);

    // console.log('allIncludes of ', templateName, '==> ', allIncludes.includes.map(e => e.file).join(', '));

    let svelteIncludes = allIncludes.includes.filter(e => e.file === 'svelte');
    if (svelteIncludes.length === 0) { return 1; }
      svelteIncludes = svelteIncludes.map(e =>
      {
        let module = '';
        try {
          module = e.hash.module.input.match(/'([^']+)'/)[1];
        } catch (error) {
          console.log('Could not get module in svelte include');
        }

        return { ...e, module };
      });
      
      console.log(templateName, 'has Svelte includes ', svelteIncludes, allIncludes);
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
      const inputOptions = {
        input: entryPath.fsPath,
        plugins: [
          liquivelteSveltePlugin({
            emitCss: true
          }),
          svelte({
            compilerOptions: {
                hydratable: true,
                css: false,
              },
            emitCss: true
          }),
          css({ output: `${templateName}.css` }),
          liquivelteLiquidPlugin({
            themePath: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided).fsPath,
          }),
          resolve({
            browser: true,
          }),
          commonjs(),
          // terser({
          //   module: true,
          //   compress: { join_vars: false, collapse_vars: false, dead_code: false, drop_console: true, unused: false },
          //   mangle: { keep_fnames: true, keep_classnames: true },
          //   output: { beautify: false, quote_style: 3 },
          //   parse: {},
          // })
        ]
      };
  
      // you can create multiple outputs from the same input to generate e.g.
      // different formats like CommonJS and ESM
      const outputOptionsList = [{
        sourcemap: false,
        name: 'theme.liquivelte.' + templateName.replace('.liquid', ''),
        format: 'iife',
        file: vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'assets', `${templateName}.js`).fsPath,
      }];

      state[templateName] = { loading: true };

      await build();
  
      state[templateName] = { loading: false };

      async function build ()
      {
        let bundle;
        let buildFailed = false;
        try {
          // create a bundle
          bundle = await rollup(inputOptions);
  
          // an array of file names this bundle depends on
          // console.log(bundle.watchFiles);
  
          await generateOutputs(bundle);
        } catch (error) {
          buildFailed = true;
          // do some error reporting
          console.error(error);
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
          // generate output specific code in-memory
          // you can call this function multiple times on the same bundle object
          // replace bundle.generate with bundle.write to directly write to disk
          const { output } = await bundle.write(outputOptions);
  
          for (const chunkOrAsset of output) {
            if (chunkOrAsset.type === 'asset') {
              // For assets, this contains
              // {
              //   fileName: string,              // the asset file name
              //   source: string | Uint8Array    // the asset source
              //   type: 'asset'                  // signifies that this is an asset
              // }
              console.log('Asset', chunkOrAsset);
            } else {
              // For chunks, this contains
              // {
              //   code: string,                  // the generated JS code
              //   dynamicImports: string[],      // external modules imported dynamically by the chunk
              //   exports: string[],             // exported variable names
              //   facadeModuleId: string | null, // the id of a module that this chunk corresponds to
              //   fileName: string,              // the chunk file name
              //   implicitlyLoadedBefore: string[]; // entries that should only be loaded after this chunk
              //   imports: string[],             // external modules imported statically by the chunk
              //   importedBindings: {[imported: string]: string[]} // imported bindings per dependency
              //   isDynamicEntry: boolean,       // is this chunk a dynamic entry point
              //   isEntry: boolean,              // is this chunk a static entry point
              //   isImplicitEntry: boolean,      // should this chunk only be loaded after other chunks
              //   map: string | null,            // sourcemaps if present
              //   modules: {                     // information about the modules in this chunk
              //     [id: string]: {
              //       renderedExports: string[]; // exported variable names that were included
              //       removedExports: string[];  // exported variable names that were removed
              //       renderedLength: number;    // the length of the remaining code in this module
              //       originalLength: number;    // the original length of the code in this module
              //       code: string | null;       // remaining code in this module
              //     };
              //   },
              //   name: string                   // the name of this chunk as used in naming patterns
              //   referencedFiles: string[]      // files referenced via import.meta.ROLLUP_FILE_URL_<id>
              //   type: 'chunk',                 // signifies that this is a chunk
              // }
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

export async function getAllIncludes (templateName: string, firstFile: vscode.Uri, themeDirectoryProvided: string)
{
    let allIncludes = [];
    async function getIncludes (file: vscode.Uri)
    {
      try {
        const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'sections');
        const snippetsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'snippets');
  
        // console.log('file ', file.path.split('/').pop());
        let templateFile = (await vscode.workspace.fs.readFile(file)).toString();

        if (path.parse(file.path).ext === '.json') {
          const json = JSON.parse(templateFile.toString());
          const sections = Object.keys(json.sections).map(sectionName => json.sections[sectionName].type);
          templateFile = (await Promise.all(sections.map(async section =>
          {
            return await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, `${section}.liquid`));
          }))).reduce((acc, curr) => acc + curr.toString(), '');
          }
      
        const parsed = liquidEngine.parse(templateFile);
        // @ts-nocheck
        // @ts-ignore
        const includes = parsed.reduce((col, block) =>
        {
          // @ts-ignore
          if (block.impl?.file === 'svelte') {
            // console.log('Branch ', block, block.impl?.file === 'svelte');
          }
      
          // @ts-ignore
          const branchTemplates = (block.impl?.branches || []).reduce((col, branch) =>
          {
            return [...col, ...(branch?.templates || [])];
          }, []);
          // @ts-ignore
          return [...col, block, ...branchTemplates, ...(block.impl?.templates || [])];
        }, [])
          // @ts-ignore
          .filter(block => block.constructor.name === 'Tag' && (block.name === 'section' || block.name === 'include'))
          // @ts-ignore
          .map(include =>
          {
            if (!(include.impl.namestr || include.impl.file || '').replace) {
              console.log('include.impl.namestr, include.impl.file ', include.impl.file, include);
            }
            return ({ hash: include.impl?.hash?.hash, name: include.name, file: (include.impl.namestr || include.impl.file?.input || include.impl.file || '').replace(/^["']|["']$/gi, '') });
          });
    
        // console.log(file.path.split('/').pop(), ' includes ', parsed);
        if (includes.length) {
          allIncludes = [...allIncludes, ...includes];
          await Promise.all(includes.map(async include =>
          {
            if (!include.file) {
              console.log('include.file ', include);
            }
            const includeUri = vscode.Uri.joinPath(include.name === 'section' ? sectionsFolder : snippetsFolder, `${include.file.replace(/^["']|["']$/gi, '')}.liquid`);
            // console.log('calling sub include', includeUri.path.split('/').pop());
            await getIncludes(includeUri);
          }));
        }
      } catch (err) {
        throw err;
      }
    }
  
    await getIncludes(firstFile);
  
    return {
      template: templateName,
      includes: allIncludes
    };
}