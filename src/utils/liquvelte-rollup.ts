// @ts-nocheck
import fs from 'fs-extra';
import path from 'path';

import liquivelteTransformer from '../preprocess/preprocessor';
import vscode from 'vscode';

import relative from 'require-relative';
import { createFilter } from '@rollup/pluginutils';
import { compile, preprocess } from 'svelte/compiler';
import addCssClassesToLiquid from "./inject-liquid-classes";

import state from './state';

import { SECTION_BLOCKS_LIQUID, CART_JSON_LIQUID } from './liquid-fragments';

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
			// console.log('deptree ', inclTree);

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
			
			const result = (await new Promise((done) =>
			{
				(async () =>
				{
					async function generateTransformedModules() {
						let lastResult = null;
						for (let dep of deps) {
							let res;
							if (state.preprocess_results_cache.has(dep) && !state.preprocess_results_cache.get(dep).shouldRebuild) {
								res = state.preprocess_results_cache.get(dep);
								res.shouldRebuild = !prebuildDone;
							} else {
								// console.log('Caches ', deps.map(dep => `${dep.match(/[^\/]+$/)[0]} ${state.preprocess_results_cache.has(dep) ? 'has' : 'doesnt have'} cached result`));
								// console.log('Submodules built ', deps.filter(dep => dep != id).every(dep => state.preprocess_results_cache.has(dep)));
								res = await liquivelteTransformer(fs.readFileSync(dep).toString(), vscode.Uri.parse(dep), lastResult);
								res.shouldRebuild = !prebuildDone;
								state.preprocess_results_cache.set(dep, res);
							}
							lastResult = res;
						}
						return lastResult;
					}

					let result = await generateTransformedModules();
					// console.log('shouldRebuild', result.shouldRebuild);
					if (result.shouldRebuild) {
						result = await generateTransformedModules();
					}
					// let attempts = 0;
					// while (prebuildDone && !deps.filter(dep => dep != id).every(dep => state.preprocess_results_cache.has(dep))) {
					// 	attempts++;
					// 	if (attempts > 10) {
					// 		console.log('Too many attempts to build submodules for ', id);
					// 		break;
					// 	}
					// 	result = await generateTransformedModules();
					// }
					result.deps = deps.filter(dep => dep != id);
					state.preprocess_results_cache.set(id, result);
					return result;
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
			// console.log(arguments);
		},
		renderChunk (code, options)
		{
			// console.log(options);
		},
		augmentChunkHash (code, chunk, hash)
		{
			// console.log(chunk, hash);
		},
		/**
		 * All resolutions done; display warnings wrt `package.json` access.
		 */
		generateBundle: function generateBundle ()
		{
			const prebuildDone = state.prebuildDone;
			// console.log('prebuildDone', prebuildDone);
			// if (!prebuildDone) {
			// 	this.error({ frame: 'This is not a real error. We just stop here for next round of build.' });
			// 	return null;
			// }
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
		generateBundle: async function generateBundle (opts, bundle)
		{
			// console.log('generating liquid bundle');
			const prebuildDone = state.prebuildDone;
			const watchMode = state.watching;

			// if (!prebuildDone) {
				
				const chunkFiles = [];
				Object.keys(bundle).map(key => bundle[key]).forEach(file =>
				{
					if (file.type === 'chunk') {
						chunkFiles.push(file);
					}
				});

			// if (!prebuildDone) return;
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
					let filePath = path.parse(id);
					let parentFolderSectionsOrSnippets = filePath.dir.split('/').reduce((c, piece) => c.includes('snippets') || c.includes('sections') ? [...c] : [...c, piece], []).join('/');
					if (!parentFolderSectionsOrSnippets) {
						throw new Error(`Could not determine parent folder for ${id}`);
					}
					const parentFolder = path.parse(parentFolderSectionsOrSnippets);
					let fileName = filePath.base;
					if (fileName == 'index.liquid' && parentFolder.name == 'sections') {
						// WE DO THIS BECAUSE WHEN A SECTION IS A FOLDER WE WANT TO USE THE INDEX.LIQUID FILE BUT FOLDER NAME FOR LIQUID FILE
						filePath = path.parse(filePath.dir);
						fileName = `${filePath.base}.liquid`;
					}

					let parentFolderName = parentFolder.base;
					// IF MODULE IS IN SECTIONS FOLDER BUT IS A SUB-MODULE WE MOVE IT INTO SNIPPETS INSTEAD OF SECTIONS
					if (parentFolderName == 'sections' && path.parse(filePath.dir).base !== 'sections') {
						parentFolderName = 'snippets';
					}
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

					if (parentFolderName != 'sections') {
						
						finalLiquidContent = finalLiquidContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, '');
					}

					finalLiquidContent = finalLiquidContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) =>
					{ 
						const subSchemas = imp.deps.filter(dep => state.preprocess_results_cache.has(dep)).map(dep =>
						{
							const depImpl = state.preprocess_results_cache.get(dep);
							const fileContent = depImpl.liquidContent;

							if (/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim.test(fileContent)) {
								let schemaJson;
								fileContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) =>
								{
									schemaJson = content
									return '';
								});
								let schema = false;
								try {
									schema = JSON.parse(schemaJson);
								} catch (err) {
									console.log('schema could not be parsed', schemaJson);
								}
								return schema;
							}
							// if no schema return false
							return false;
						}).filter(e => !!e);

						let schema = JSON.parse(content);

						subSchemas.forEach(subSchema =>
						{ 
							if (subSchema.type) {
								schema = { ...schema, blocks: [...(schema.blocks), subSchema] };
							} else {
								schema = {
									...schema, settings: [...(schema.settings || []), ...(subSchema.name ? [{
										type: "header",
										content: subSchema.name,
									}] : []), ...(subSchema.settings || [])]
								};
							}
						});
						return a.replace(content, JSON.stringify(schema, null, 2));
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
	${Object.keys(dynamicClasses).map(exp => `  if ${exp.replace(/[\{\}]/gim, '').replace(/^[^a-zA-Z]/, '')}
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

					const parsePropsFn = `function parseProps(e){const s={};let t={bracketsOpened:0,get open(){return this.bracketsOpened>0},set open(e){!0===e?this.bracketsOpened=this.bracketsOpened+1:!1===e&&(this.bracketsOpened=this.bracketsOpened-1)}},a=\` \${e} \`.split(""),r=!1,c=!1,n=!1,p=!1,o="",b="";for(let e=0;e<a.length;e++){const k=a[e];switch(!0){case" "===k:p||t.open||(c=!1),!n||p||t.open||(n=!1);break;case"{"===k:t.open=!0,n||(c=!0);break;case"}"===k:t.open=!1;break;case'"'===k:p=!p;break;case"="===k:c&&(c=!1,n=!0,r=!0);break;case/[^\\s]/.test(k):n||(c=!0)}!c||n||r?c||!n||r?c||n||(o&&(s[o]=b.replace(/^"/,"").replace(/"$/,"")),b="",o=""):b+=k:o+=k,r=!1}return Object.keys(s).map((e=>{if(/\\{\\s*\\.\\.\\.(\\w+)\\s*\\}/.test(e)){const[,t]=e.match(/\\{\\s*\\.\\.\\.(\\w+)\\s*\\}/);s.spread=t,delete s[e]}})),s}`;
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
					const propsParserScript = `<script class="liquivelte-prop-script">(() => {
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
	// liquid expression cache
	[...wrapper.querySelectorAll('[liquivelte-value-cache]')].forEach(el => {
		let [filter, args, value] = el.getAttribute('liquivelte-value-cache').split('§');
		args = args.split(', ');
		wrapper.liquid_expression_cache = {};
		wrapper.liquid_expression_cache[filter] = new Map;
		wrapper.liquid_expression_cache[filter].set(\`\${args.join(',')}\`, value);
	});

	if(propScript){
		propScript.remove();
	}
	if(propScript.previousElementSibling) {
		propScript.previousElementSibling.remove();
	}
	})();</script>`;

					const propsContent = `
${liquidImportsModule.some(v => v == 'cart') ? CART_JSON_LIQUID  : ''}					
${subImportsRegistryModule.some(v => v.id == 'section$blocks') ? SECTION_BLOCKS_LIQUID  : ''}					
<script type="text/noscript" class="instance-data">{
			${liquidImportsModule
							.map(v => 	v == 'cart' ?
								`"${v}": {{ cart_json }}`
								: `"${v}" : {{ ${v} | json }} `)
							.join(', ')
						}
			${liquidImportsModule.length && subImportsRegistryModule.length ? ',' : ''}
			${subImportsRegistryModule
						.map(v =>
							v.id == 'section$blocks' ?
								`"${v.id}": {{ section_blocks_json }}`
							: `"${v.id}": {{ ${v.importStatement} | json }} `)
							.join(', ')
						}

			}</script>
`;

					finalLiquidContent = `
${liquidPropsParser}
	{%- unless sub_include -%} 
		<div class="liquivelte-component ${fileName.replace('.liquid', '')}" data-liquivelte-component-name="${fileName.replace('.liquid', '')}">
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

import { createFilter } from '@rollup/pluginutils';

export function css(options) {
  if ( options === void 0 ) options = {};

  var filter = createFilter(options.include || ['**/*.css'], options.exclude);
  var styles = {};
  var order = [];
  var dest = options.output;
  var changes = 0;

  return {
    name: 'css',
    transform: function transform(code, id) {
      if (!filter(id)) {
        return
      }

      // When output is disabled, the stylesheet is exported as a string
      if (options.output === false) {
        return {
          code: 'export default ' + JSON.stringify(code),
          map: { mappings: '' }
        }
      }

      // Track the order that each stylesheet is imported.
      if (!order.includes(id)) {
        order.push(id);
      }

      // Keep track of every stylesheet
      // Check if it changed since last render
      if (styles[id] !== code && (styles[id] || code)) {
        styles[id] = code;
        changes++;
      }

      return ''
    },
    generateBundle: function (opts, bundle) {
      // No stylesheet needed
      if (!changes || options.output === false) {
        return
      }
      changes = 0;

      // Combine all stylesheets, respecting import order
      // var css = '';
      // for (var x = 0; x < order.length; x++) {
      //   var id = order[x];
      //   css += styles[id] || '';
      // }

      // Emit styles through callback
      if (typeof options.output === 'function') {
        options.output(css, styles, bundle);
        return
      }

      if (typeof dest !== 'string') {
        // Don't create unwanted empty stylesheets
        if (!css.length) {
          return
        }

        // Guess destination filename
        dest =
          opts.file ||
          (Array.isArray(opts.output)
            ? opts.output[0].file
            : opts.output && opts.output.file) ||
          opts.dest ||
          'bundle.js';
        if (dest.endsWith('.js')) {
          dest = dest.slice(0, -3);
        }
        dest = dest + '.css';
			}
			
			[...Object.keys(bundle).map(k => bundle[k])].filter(m => m.isEntry).map(m =>
			{
				const css = [...m.imports, ...m.dynamicImports].reduce((c, id) =>
				{
					const styleModules = Object.keys(styles).filter(s => s.indexOf(id.replace(/-hs.+\.js/, '')) > -1);
					const style = styleModules.reduce((_c, m) => `${_c} ${styles[m]}`, '');
					return `${c} ${style || ''}`;
				}, '');

				this.emitFile({ type: 'asset', fileName: `${m.fileName.slice(0, -3)}.css`, source: css });
			});

      // Emit styles to file
      // this.emitFile({ type: 'asset', fileName: dest, source: css });
    }
  }
}
