// @ts-nocheck
import fs from 'fs-extra';
import path from 'path';
import liquivelteTransformer from '../preprocess/preprocessor';
import vscode from 'vscode';

import relative from 'require-relative';
import { createFilter } from '@rollup/pluginutils';
import { compile, preprocess } from 'svelte/compiler';
import addCssClassesToLiquid from "./inject-liquid-classes";
import toCamelCase from './to-camel-case';
import state from './state';

state.set = { incl_tree: {} };
const PREFIX = '[rollup-plugin-liquivelte]';
const pkg_export_errors = new Set();

const plugin_options = new Set([
	'preprocess',
	'emitCss',
	'exclude',
	'extensions',
	'include',
	'onwarn'
]);
state.set = {
	liquivelte_imports_cache: new Map,
	theme_imports_cache: new Map,
	main_imports_cache: new Map,
	preprocess_results_cache: new Map
};

/**
 * @param [options] {Partial<import('.').Options>}
 * @returns {import('rollup').Plugin}
 */
export function liquivelteSveltePlugin (options = {})
{
	// @ts-ignore
	const { compilerOptions = {}, ...rest } = options;
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
	const { onwarn, emitCss = true } = rest;

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
		resolveId (importee, importer)
		{
			if (path.parse(importee).ext === '.liquivelte' && path.parse(importer).ext === '.liquivelte') {
				state.liquivelte_imports_cache.set(importee, importer);
				state.incl_tree[importer] = [...(state.incl_tree[importer] || []), importee];
			} else if (path.parse(importee).ext === '.liquivelte' && path.parse(importer).ext !== '.liquivelte') {
				const main_import = importee.replace('.liquivelte', '.liquid');
				state.main_imports_cache.set(importer, main_import);
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
		load (id)
		{
			return cache_emit.get(id) || null;
		},

		/**
		 * Transforms a `.svelte` file into a `.js` file.
		 * NOTE: If `emitCss`, append static `import` to virtual CSS file.
		 */
		async transform (code, id)
		{
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
				}, filename
			};

			const inclTree = state['incl_tree'];
			console.log('deptree ', inclTree);

			function getDeps (start)
			{
				let deps = [];
				function getDepsOf (_s)
				{
					const d = (inclTree[_s] || []).filter(_d => _d[0] === '/');
					deps = [...deps, ...(d || [])];
					(d || []).forEach(dep => getDepsOf(dep));
				}
				getDepsOf(start);
				return Array.from(new Set([id, ...deps])).reverse();
			}

			const deps = getDeps(id);
			const prebuildDone = state['prebuildDone'];
			const watchMode = state['watching'];

			const result = !prebuildDone ?
				(await liquivelteTransformer(fs.readFileSync(id).toString(), vscode.Uri.parse(id)))
				:
				(await new Promise((done) =>
				{
					(async () =>
					{
						let lastResult = null;
						for (let dep of deps) {
							let res;
							if (state.preprocess_results_cache.has(dep)) {
								res = state.preprocess_results_cache.get(dep);
							} else {
								res = await liquivelteTransformer(fs.readFileSync(dep).toString(), vscode.Uri.parse(dep), lastResult);
								state.preprocess_results_cache.set(dep, res);
							}
							lastResult = res;
						}
						return lastResult;
					})().then(finalRes => done(finalRes)).catch(err => { throw err; });
				}));

			// const result = await liquivelteTransformer(fs.readFileSync(id).toString(), vscode.Uri.parse(id));
			if (result.map) svelte_options.sourcemap = result.map;
			code = result.content;

			if (rest.preprocess) {
				const processed = await preprocess(code, rest.preprocess, { filename });
				if (processed.dependencies) dependencies.push(...processed.dependencies);
				if (processed.map) svelte_options.sourcemap = processed.map;
				code = processed.code;
			}

			const compiled = compile(code, svelte_options);

			(compiled.warnings || []).forEach(warning =>
			{
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
			const liquidContent = result?.liquidContent;
			compiled.js.code += `\nimport ${JSON.stringify(liquidfname)};\n`;
			cache_emit.set(liquidfname, { code: liquidContent });
			// @ts-ignore
			result.svelteCssHashes = svelteCssHashes[id];
			state.theme_imports_cache.set(liquidfname, result || {});

			if (this.addWatchFile) {
				dependencies.forEach(this.addWatchFile);
			} else {
				compiled.js.dependencies = dependencies;
			}

			return compiled.js;
		},
		async buildEnd ()
		{
			console.log(arguments);
		},
		renderChunk (code, options)
		{
			console.log(options);
		},
		augmentChunkHash (code, chunk, hash)
		{
			console.log(chunk);
		},
		/**
		 * All resolutions done; display warnings wrt `package.json` access.
		 */
		generateBundle: function generateBundle ()
		{
			const prebuildDone = state.prebuildDone;
			if (!prebuildDone) {
				this.error({ frame: 'This is not a real error. We just stop here for next round of build.' });
				return null;
			}
			if (pkg_export_errors.size > 0) {
				console.warn(`\n${PREFIX} The following packages did not export their \`package.json\` file so we could not check the "svelte" field. If you had difficulties importing svelte components from a package, then please contact the author and ask them to export the package.json file.\n`);
				console.warn(Array.from(pkg_export_errors, s => `- ${s}`).join('\n') + '\n');
			}
		}
	};
};

export function liquivelteLiquidPlugin (options?)
{
	if (options === void 0) options = {};

	var filter = createFilter(options.include || ['**/*.liquid'], options.exclude);
	var themePath = options.themePath;
	var liquidTemplates = {};
	var order = [];
	var changes = 0;

	return {
		name: 'liquivelte-liquid-plugin',
		transform: function transform (code, id)
		{
			if (!filter(id)) {
				return;
			}

			const filePath = path.parse(id);
			let parentFolderSectionsOrSnippets = filePath.dir.split('/').reduce((c, piece) => c.includes('snippets') || c.includes('sections') ? [...c] : [...c, piece], []).join('/');
			if (!parentFolderSectionsOrSnippets) {
				throw new Error(`Could not determine parent folder for ${id}`);
			}
			const parentFolder = path.parse(parentFolderSectionsOrSnippets);
			const fileName = filePath.base;
			const parentFolderName = parentFolder.base;
			// const dest = path.resolve(themePath, parentFolderName, fileName);
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
			const prebuildDone = state.prebuildDone;
			const watchMode = state.watching;

			if (!prebuildDone) return;
			Array.from(state.preprocess_results_cache).forEach(([key, value]) =>
			{
				fs.outputFileSync(key.replace(/\/src\/[^\/]+\//, '/src/.svelte/').replace('.liquivelte', ".svelte"), value.content);
			});
			const bundleModules = bundle[Object.keys(bundle).find(key => /\.js$/.test(key))].modules;
			const entryModule = Object.keys(bundleModules).find(key => /\.templates/.test(key));
			const main_import = state.main_imports_cache.get(entryModule);
			// let {
			// 	liquidImportsModule,
			// 	subImportsRegistryModule,
			// 	exportedVariables,
			// 	exportedObjectVariables,
			// 	rawIncludeRegistry,
			// 	...rest
			// } = state.theme_imports_cache.get(main_import);

			// Array.from(state.theme_imports_cache).forEach(([id, imp]) =>
			// {
			// 	if (id === main_import) { return; }

			// 	const {
			// 		liquidImportsModule: newLiquidImportsModule,
			// 		subImportsRegistryModule: newSubImportsRegistryModule,
			// 		exportedVariables: newExportedVariables,
			// 		exportedObjectVariables: newExportedObjectVariables,
			// 		rawIncludeRegistry: newRawIncludeRegistry,
			// 	} = imp;

			// 	liquidImportsModule = [...liquidImportsModule, ...newLiquidImportsModule];
			// 	subImportsRegistryModule = [...subImportsRegistryModule, ...newSubImportsRegistryModule];
			// 	exportedVariables = [...exportedVariables, ...newExportedVariables];
			// 	exportedObjectVariables = [...exportedObjectVariables, ...newExportedObjectVariables];
			// 	rawIncludeRegistry = [...rawIncludeRegistry, ...newRawIncludeRegistry];
			// });

			Array.from(state.theme_imports_cache).forEach(([id, imp]) =>
			{
				try {
					let {
						liquidImportsModule,
						subImportsRegistryModule,
						exportedVariables,
						exportedObjectVariables,
						rawIncludeRegistry,
						...rest
					} = state.theme_imports_cache.get(id);
					const filePath = path.parse(id);
					let parentFolderSectionsOrSnippets = filePath.dir.split('/').reduce((c, piece) => c.includes('snippets') || c.includes('sections') ? [...c] : [...c, piece], []).join('/');
					if (!parentFolderSectionsOrSnippets) {
						throw new Error(`Could not determine parent folder for ${id}`);
					}
					const parentFolder = path.parse(parentFolderSectionsOrSnippets);
					const fileName = filePath.base;
					const parentFolderName = parentFolder.base;
					const dest = path.resolve(themePath, parentFolderName, fileName);
					let finalLiquidContent = imp.liquidContent.replace(/<slot\s*(name="([^"]+)")?[^/]*\/>/gi, function (a, named, name, offset)
					{
						if (!named) {
							return `{%- liquid 
	assign slot_contents_and_values = slot_contents | split: '-scs-'
	for content_and_value in slot_contents_and_values
		assign module = content_and_value | split: '-scvs-' | first
		assign value = content_and_value | split: '-scvs-' | last
		if module == '${path.parse(id).name}'
			assign children = value | strip
		endif
	endfor
-%}
{%- if children != blank -%}
	{{- children -}}
{%- endif -%}
{%- assign children = '' -%}
`;
						}
						return `{%- liquid
	assign slot_contents_and_values = slot_contents | split: '-scs-'
	for content_and_value in slot_contents_and_values
	assign module_and_slotname = content_and_value | split: '-scvs-' | first
	assign module = module_and_slotname | split: '-smns-' | first
	assign name = module_and_slotname | split: '-smns-' | last
	assign value = content_and_value | split: '-scvs-' | last
	if module == '${path.parse(id).name}' and name == '${name}'
		assign children_${name} = value | strip
	endif
endfor
-%}
{%- if children_${name} != blank -%}
{{- children_${name} -}}
{%- endif -%}
{%- assign children_${name} = '' -%}
`;

					});

					finalLiquidContent = finalLiquidContent.replace(/<(\w+)(\s[^>]+)>/gim, (a, tagName, content) =>
					{
						const dynamicClasses = {};
						content = content.replace(/\s(class:?([^=]+)?="([^"]+)")/gim, (_a, dynamicOrRegularClass, className, expression) =>
						{
							// console.log(_a);
							// console.log(dynamicOrRegularClass);
							// console.log(className);
							// console.log(expression);
							expression = expression.replace(/(\{\{-?)|(-?\}\})/g, '').trim();
							if (className) {
								dynamicClasses[expression] = className;
							}
							return className ?
								'' : _a;
						});
						if (!Object.keys(dynamicClasses).length) {
							return a;
						}
						const hasClass = /class="([^"]+)"/gim.test(content);
						if (hasClass) {
							content = content.replace(/class="([^"]+)"/gim, (a, classContent) =>
							{
								// console.log(tagName, classContent);
								return `class="${classContent}{{ dynamic_classes }}"`;
							});
						} else {
							content = `class="{{ dynamic_classes }}"${content}`;
						}
						// console.log(tagName, hasClass);
						return `
{%- liquid 
	assign dynamic_classes = ''
	${Object.keys(dynamicClasses).map(exp => `  if ${exp.replace(/[\{\}]/gim, '')}
			assign dynamic_classes = dynamic_classes | append: ' ${dynamicClasses[exp]}'
		endif`)}
-%}
<${tagName} ${content}>`;
					});

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

					const parsePropsFn = `function parseProps(e){const s={};let t={bracketsOpened:0,get open(){return this.bracketsOpened>0},set open(e){!0===e?this.bracketsOpened=this.bracketsOpened+1:!1===e&&(this.bracketsOpened=this.bracketsOpened-1)}},a=\` \${e} \`.split(""),n=!1,c=!1,r=!1,p=!1,b="",k="";for(let e=0;e<a.length;e++){const o=a[e];switch(!0){case" "===o:p||t.open||(c=!1),!r||p||t.open||(r=!1);break;case"{"===o:t.open=!0,r||(c=!0);break;case"}"===o:t.open=!1;break;case'"'===o:p=!p;break;case"="===o:c&&(c=!1,r=!0,n=!0);break;case/[^\\s]/.test(o):r||(c=!0)}!c||r||n?c||!r||n?c||r||(b&&(s[b]=k),k="",b=""):k+=o:b+=o,n=!1}return Object.keys(s).map((e=>{if(/\\{\\s*\\.\\.\\.(\\w+)\\s*\\}/.test(e)){const[,t]=e.match(/\\{\\s*\\.\\.\\.(\\w+)\\s*\\}/);s.spread=t,delete s[e]}})),s}`;
					// eslint-disable-next-line @typescript-eslint/naming-convention
					const JSONParseFn = `function JSONparse(n){try{return JSON.parse(n)}catch(t){try{const e=parseInt(t.message.match(/position\\s+(\\d+)/)[1],10),s=n.slice(0,e+1).split("\\n"),i=s.length,l=n.split("\\n"),r=s[s.length-1].length-1,c=l.slice(0,i).join("\\n")+"\\n"+new Array(r).fill(" ").join("")+"👆\\n"+l.slice(i).join("\\n");return console.log(c),{}}catch(n){throw t}}}`;
					const liquidPropsParser = `{%- liquid
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
-%}`;
					const propsParserScript = `<script>(() => {
	var propScript = Shopify.designMode && window.propScriptForDesignMode ? window.propScriptForDesignMode : document.currentScript;
	${parsePropsFn}
	${JSONParseFn}
	function htmlDecode(input) {
		var doc = new DOMParser().parseFromString(input, "text/html");
		return doc.documentElement.textContent;
		}
	function componentWrapper(el) {
			if(el.classList.contains('liquivelte-component')) {
			return el;
			} else {
			return componentWrapper(el.parentElement);
			}
	}
	var wrapper = componentWrapper(propScript.parentElement);
	// console.log('wrapper', wrapper);
	// console.log('parsing props for svelte component');
	try{
			wrapper.svelteProps = { ...(wrapper.svelteProps || {}), ...(JSONparse(propScript.previousElementSibling.innerText)) };
	
	${imp.formIncludes.length ? imp.formIncludes.map(entry => `
		wrapper.svelteProps["form_inputs_${entry.id}"] = [...(wrapper.svelteProps["form_inputs_${entry.id}"] || []), htmlDecode(window.liquivelte_form_inputs['form_inputs_${entry.id}']) ];
		wrapper.svelteProps["form_props_${entry.id}"] = [...(wrapper.svelteProps["form_props_${entry.id}"] || []), parseProps(window.liquivelte_form_props['form_props_${entry.id}']) ];
	`).join(';') : ''}
	${imp.rawIncludeRegistry.length ? imp.rawIncludeRegistry.map(entry => `
		wrapper.svelteProps["${entry.id}"] = [...(wrapper.svelteProps["${entry.id}"] || []), htmlDecode(window.liquivelte_rawincludes['${entry.id}']) ];
	`).join(';') : ''}
	} catch (e) {
			console.error('there was an error parsing props json', e);
			wrapper.svelteProps = { error: 'there was an error parsing props json'};
	}
	propScript.previousElementSibling.remove();
	propScript.remove();
	})();</script>`;

					const propsContent = `<script type="text/noscript" class="instance-data">{
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
`;

					finalLiquidContent = `
${liquidPropsParser}
	{%- unless sub_include -%} 
		<div class="liquivelte-component ${fileName.replace('.liquid', '')}">
	{%- endunless -%}
${finalLiquidContent}
${propsContent}
${propsParserScript}
	{%- unless sub_include -%} 
		</div>
	{%- endunless -%}
`;

					finalLiquidContent = imp.svelteCssHashes ? addCssClassesToLiquid(`svelte-${imp.svelteCssHashes}`, finalLiquidContent) : finalLiquidContent;

					fs.outputFileSync(dest, finalLiquidContent);
				} catch (err) {
					this.error(err);
				}
			});
			state.theme_imports_cache.clear();
		}
	}
}