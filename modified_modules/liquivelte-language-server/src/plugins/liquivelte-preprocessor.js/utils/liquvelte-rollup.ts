import fs from 'fs';
import path from 'path';
import liquivelteTransformer from '../preprocess/preprocessor';
import vscode from 'vscode';

import relative from 'require-relative';
import { createFilter } from '@rollup/pluginutils';
import { compile } from 'svelte/compiler';
import addCssClassesToLiquid from "./inject-liquid-classes";
import toCamelCase from './to-camel-case';

const PREFIX = '[rollup-plugin-liquivelte]';
const pkg_export_errors = new Set();

const plugin_options = new Set([
	'emitCss',
	'exclude',
	'extensions',
	'include',
  'onwarn'
]);

const theme_imports_cache = new Map;
const liquivelte_imports_cache = new Map;
let main_import = '';
/**
 * @param [options] {Partial<import('.').Options>}
 * @returns {import('rollup').Plugin}
 */
export function liquivelteSveltePlugin (options = {})
{
    // @ts-ignore
	const { compilerOptions={}, ...rest } = options;
	// @ts-ignore
  const extensions = rest.extensions || ['.liquivelte'];
	// @ts-ignore
  const filter = createFilter(rest.include, rest.exclude);

	const svelteCssHashes = {};

	compilerOptions.format = 'esm';

	for (const key in rest) {
		if (plugin_options.has(key)) continue;
		console.warn(`${PREFIX} Unknown "${key}" option. Please use "compilerOptions" for any Svelte compiler configuration.`);
	}

	// [filename]:[chunk]
  const cache_emit = new Map;
  // @ts-ignore
	const { onwarn, emitCss=true } = rest;

	if (emitCss) {
		if (compilerOptions.css) {
			console.warn(`${PREFIX} Forcing \`"compilerOptions.css": false\` because "emitCss" was truthy.`);
		}
		compilerOptions.css = false;
	}

	return {
		name: 'liquivelte',

		/**
		 * Resolve an import's full filepath.
		 */
		resolveId(importee, importer) {
			if (path.parse(importee).ext === '.liquivelte' && path.parse(importer).ext === '.liquivelte') { 
				liquivelte_imports_cache.set(importee, importer);
			} else if (path.parse(importee).ext === '.liquivelte' && path.parse(importer).ext !== '.liquivelte') {
				main_import = importee.replace('.liquivelte', '.liquid');
			}
			if (cache_emit.has(importee)) return importee;
			if (!importer || importee[0] === '.' || importee[0] === '\0' || path.isAbsolute(importee)) return null;
			
			// if this is a bare import, see if there's a valid pkg.svelte
			const parts = importee.split('/');

			let dir, pkg, name = parts.shift();
			if (name && name[0] === '@') {
				name += `/${parts.shift()}`;
			}

			try {
				const file = `${name}/package.json`;
				const resolved = relative.resolve(file, path.dirname(importer));
				dir = path.dirname(resolved);
				pkg = require(resolved);
			} catch (err) {
				if (err.code === 'MODULE_NOT_FOUND') return null;
				if (err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
					pkg_export_errors.add(name);
					return null;
				}
				throw err;
			}

			// use pkg.svelte
			if (parts.length === 0 && pkg.svelte) {
				return path.resolve(dir, pkg.svelte);
			}
		},

		/**
		 * Returns CSS contents for a file, if ours
		 */
		load(id) {
			return cache_emit.get(id) || null;
		},

		/**
		 * Transforms a `.svelte` file into a `.js` file.
		 * NOTE: If `emitCss`, append static `import` to virtual CSS file.
		 */
		async transform(code, id) {
			if (!filter(id)) return null;

			const extension = path.extname(id);
			if (!~extensions.indexOf(extension)) return null;

			const dependencies = [];
			const filename = path.relative(process.cwd(), id);
			const svelte_options = {
				hydratable: true,
				css: false,
				cssHash: ({ hash, css, name, filename }) =>
				{
					svelteCssHashes[`/${filename}`] = hash(css);
					var classNameGenerated = `svelte-${hash(css)}`;
					return classNameGenerated;
				}, filename };

      const result = await liquivelteTransformer(fs.readFileSync(id).toString(), vscode.Uri.parse(id));
      if (result.map) svelte_options.sourcemap = result.map;
      code = result.content;

			const compiled = compile(code, svelte_options);

			(compiled.warnings || []).forEach(warning => {
				if (!emitCss && warning.code === 'css-unused-selector') return;
				if (onwarn) onwarn(warning, this.warn);
				else this.warn(warning);
			});

			if (emitCss && compiled.css.code) {
				const fname = id.replace(new RegExp(`\\${extension}$`), '.css');
				compiled.js.code += `\nimport ${JSON.stringify(fname)};\n`;
				cache_emit.set(fname, compiled.css);
			}

			
      const liquidfname = id.replace(new RegExp(`\\${extension}$`), '.liquid');
			const liquidContent = addCssClassesToLiquid(svelteCssHashes[id], result.liquidContent);
      compiled.js.code += `\nimport ${JSON.stringify(liquidfname)};\n`;
			cache_emit.set(liquidfname, { code: liquidContent });
			theme_imports_cache.set(liquidfname, result);

			if (this.addWatchFile) {
				dependencies.forEach(this.addWatchFile);
			} else {
				compiled.js.dependencies = dependencies;
			}

			return compiled.js;
		},

		/**
		 * All resolutions done; display warnings wrt `package.json` access.
		 */
		generateBundle() {
			if (pkg_export_errors.size > 0) {
				console.warn(`\n${PREFIX} The following packages did not export their \`package.json\` file so we could not check the "svelte" field. If you had difficulties importing svelte components from a package, then please contact the author and ask them to export the package.json file.\n`);
				console.warn(Array.from(pkg_export_errors, s => `- ${s}`).join('\n') + '\n');
			}
		}
	};
};

export function liquivelteLiquidPlugin(options?) {
  if ( options === void 0 ) options = {};

  var filter = createFilter(options.include || ['**/*.liquid'], options.exclude);
	var themePath = options.themePath;
	var liquidTemplates = {};
  var order = [];
  var changes = 0;

  return {
    name: 'liquivelte-liquid-plugin',
    transform: function transform(code, id) {
      if (!filter(id)) {
				return;
			}
			
			const filePath = path.parse(id);
			const parentFolder = path.parse(filePath.dir);
			const fileName = filePath.base;
			const parentFolderName = parentFolder.base;
			const dest = path.resolve(themePath, parentFolderName, fileName);

			// fs.writeFileSync(dest, liquidTemplates[id]);
			return '';
		},
		// moduleParsed: function ({id})
		// {
		// 	if (!filter(id)) {
		// 		return;
		// 	}
		// },
		generateBundle: function generateBundle (opts, bundle)
		{
			let {
				liquidImportsModule,
				subImportsRegistryModule,
				exportedVariables,
				exportedObjectVariables,
				...rest
			} = theme_imports_cache.get(main_import);
			
			Array.from(theme_imports_cache).forEach(([id, imp]) =>
			{
				if (id === main_import) { return; }

				const {
					liquidImportsModule: newLiquidImportsModule,
					subImportsRegistryModule: newSubImportsRegistryModule,
					exportedVariables: newExportedVariables,
					exportedObjectVariables: newExportedObjectVariables
				} = imp;

				liquidImportsModule = [...liquidImportsModule, ...newLiquidImportsModule];
				subImportsRegistryModule = [...subImportsRegistryModule, ...newSubImportsRegistryModule];
				exportedVariables = [...exportedVariables, ...newExportedVariables];
				exportedObjectVariables = [...exportedObjectVariables, ...newExportedObjectVariables];

			});

			Array.from(theme_imports_cache).forEach(([id, imp]) =>
			{
				const filePath = path.parse(id);
				const parentFolder = path.parse(filePath.dir);
				const fileName = filePath.base;
				const parentFolderName = parentFolder.base;
				const dest = path.resolve(themePath, parentFolderName, fileName);
				let finalLiquidContent = imp.liquidContent.replace(/<slot\s*[^/]*\/>/gi, 
					`
					{% liquid 
						assign slot_contents_and_values = slot_contents | split: '-scs-'
						for content_and_value in slot_contents_and_values
							assign module = content_and_value | split: '-scvs-' | first
							assign value = content_and_value | split: '-scvs-' | last
							if module == '${path.parse(id).name}'
								assign children = value
							endif
						endfor
					%}
					{% if children != blank %}
						{{ children }}
					{% endif %}
					{% assign children = '' %}`);
				
				exportedObjectVariables.forEach(variable =>
				{
					finalLiquidContent = finalLiquidContent.replace(/\{%-*\s*if\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
					{ 
						const importedProp = Object.keys(variable)[0];
						if (exp.indexOf(importedProp) !== -1) {
							Object.keys(variable[importedProp]).forEach(key =>
							{
								a = a.replace(new RegExp(`${importedProp}\\.${key}`), `${importedProp}_${key}`);
							});
						}
						return a;
					});
				});

				if (id === main_import) {
					finalLiquidContent = `
					{% capture props_script %}
						<script type="text/noscript" class="instance-data">{
							${liquidImportsModule
															.map(v => `"${v}" : {{ ${v} | json }} `)
															.join(', ')
							}
							${liquidImportsModule.length && subImportsRegistryModule.length ? ',' : ''}
							${subImportsRegistryModule
															.map(v => `"${v.id}": {{ ${v.importStatement} | json }} `)
															.join(', ')
														}
					}</script>
					{% endcapture %}
					{% liquid 
						assign props_arr = props | split: '-prsp-'
						for prop in props_arr
							assign propName = prop | split: '-kvsp-' | first
							assign propValue = prop | split: '-kvsp-' | last | remove: '"'
							if propValue contains '{' and propValue contains '}'
								assign propValue = propValue | remove: '{' | remove: '}'
								assign propValueArr = propValue | split: ','
								for entry in propValueArr
									assign key = entry | split: ':' | first | strip | remove: '"'
									assign value = entry | split: ':' | last | strip | remove: '"'
									assign composite_key = propName | append: '_' | append: key
								${exportedObjectVariables.reduce((c, v) => `${c}
									${Object.keys(v[Object.keys(v)[0]]).reduce((cc, k) => `${cc}
									if composite_key == '${Object.keys(v)[0]}_${k}'
										assign ${Object.keys(v)[0]}_${k} = value
									endif  
									`, '')}
								`, '')}
								endfor
							endif${exportedVariables.reduce((c, v) => `${c}
							if propName == '${v}'
								assign ${v} = propValue
							endif`, '')}
						endfor
					%}${finalLiquidContent}
					`;
				} else {
					finalLiquidContent = `{% liquid 
						assign props_arr = props | split: '-prsp-'
						for prop in props_arr
							assign propName = prop | split: '-kvsp-' | first
							assign propValue = prop | split: '-kvsp-' | last | remove: '"'
							if propValue contains '{' and propValue contains '}'
								assign propValue = propValue | remove: '{' | remove: '}'
								assign propValueArr = propValue | split: ','
								for entry in propValueArr
									assign key = entry | split: ':' | first | strip | remove: '"'
									assign value = entry | split: ':' | last | strip | remove: '"'
									assign composite_key = propName | append: '_' | append: key
								${imp.exportedObjectVariables.reduce((c, v) => `${c}
									${Object.keys(v[Object.keys(v)[0]]).reduce((cc, k) => `${cc}
									if composite_key == '${Object.keys(v)[0]}_${k}'
										assign ${Object.keys(v)[0]}_${k} = value
									endif  
									`, '')}
								`, '')}
								endfor
							endif${imp.exportedVariables.reduce((c, v) => `${c}
							if propName == '${v}'
								assign ${v} = propValue
							endif`, '')}
						endfor
					%}${finalLiquidContent}
					`
				}
				
			fs.writeFileSync(dest, finalLiquidContent);
			});
		}
  }
}