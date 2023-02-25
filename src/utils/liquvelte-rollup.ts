// @ts-nocheck
import fs from 'fs-extra';
import path from 'path';

import liquivelteTransformer from '../preprocess/preprocessor';
import vscode from 'vscode';

import relative from 'require-relative';
import { createFilter } from '@rollup/pluginutils';
import { compile, preprocess } from 'svelte/compiler';
import subdir from 'subdir';
import addCssClassesToLiquid from "./inject-liquid-classes";
import { getSchemaFromLiquid, getSchemaFromModule, hasSchemaTag, stripSchema, mergeSchemas, parseSchemaJson } from './schema-parse';
import state from './state';

import { SECTION_BLOCKS_LIQUID, CART_JSON_LIQUID } from './liquid-fragments';

state.set = { incl_tree: {} };
const PREFIX = '[rollup-plugin-liquivelte]';
const pkg_export_errors = new Set();

const plugin_options = new Set([
	'themeDirectory',
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
	preprocess_results_cache: new Map,
	schema_imports_cache: new Map
};


const inclTree = state['incl_tree'];
function getDeps (start)
{
	let id = start;
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

/**
 * @param [options] {Partial<import('.').Options>}
 * @returns {import('rollup').Plugin}
 */
export function liquivelteSveltePlugin (options = {})
{
	// @ts-ignore
	const { compilerOptions = {}, themeDirectory, ...rest } = options;
	// @ts-ignore
	const extensions = rest.extensions || ['.liquivelte'];
	// @ts-ignore
	const filter = createFilter(['**/*.liquivelte'], rest.include, rest.exclude);
	const liquivelteFilter = createFilter(['**/*.liquivelte']);

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
				if (path.isAbsolute(importee)) {
					state.incl_tree[importer] = [...new Set([...(state.incl_tree[importer] || []), importee])];
				}
			} else if (path.parse(importee).ext === '.liquivelte' && path.parse(importer).ext !== '.liquivelte') {
				const main_import = importee.replace('.liquivelte', '.liquid');
				state.main_imports_cache.set(importer, main_import);
			}
			if (importee.slice(-11) === 'schema.json' && path.parse(importer).ext === '.liquivelte') { 
				if (path.isAbsolute(importee)) {
					state.schema_imports_cache.set(importer, new Set([...(state.schema_imports_cache.get(importer) || []), importee]));
				}
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
			try {
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
				// console.log('deptree ', inclTree);

				// const deps = getDeps(id);
				// const prebuildDone = state['prebuildDone'];
				// const watchMode = state['watching'];
				
				// const result = (await new Promise((done) =>
				// {
				// 	(async () =>
				// 	{
				// 		async function generateTransformedModules() {
				// 			let lastResult = null;
				// 			for (let dep of deps) {
				// 				let res;
				// 				if (state.preprocess_results_cache.has(dep) && !state.preprocess_results_cache.get(dep).shouldRebuild) {
				// 					res = state.preprocess_results_cache.get(dep);
				// 					res.shouldRebuild = !prebuildDone;
				// 				} else {
				// 					// console.log('Caches ', deps.map(dep => `${dep.match(/[^\/]+$/)[0]} ${state.preprocess_results_cache.has(dep) ? 'has' : 'doesnt have'} cached result`));
				// 					// console.log('Submodules built ', deps.filter(dep => dep != id).every(dep => state.preprocess_results_cache.has(dep)));
				// 					res = await liquivelteTransformer(fs.readFileSync(dep).toString(), vscode.Uri.parse(dep), lastResult);
				// 					res.shouldRebuild = !prebuildDone;
				// 					state.preprocess_results_cache.set(dep, res);
				// 				}
				// 				lastResult = res;
				// 			}
				// 			return lastResult;
				// 		}


						
				// 		result.deps = deps.filter(dep => dep != id);
				// 		state.preprocess_results_cache.set(id, result);
				// 		return result;
				// 	})().then(finalRes => done(finalRes)).catch(err => { throw err; });
				// }));
				
				let result = await liquivelteTransformer(fs.readFileSync(id).toString(), vscode.Uri.parse(id));
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
				// compiled.js.code += `\nimport ${JSON.stringify(liquidfname)};\n`;
				let schema;
				if (result && result.liquidContent && /\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim.test(result.liquidContent)) {
					result?.liquidContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content) => schema = content);
					try {
						schema = JSON.parse(schema);
					} catch (err) {
						schema = null;
					}
				}
				result.svelteCssHashes = svelteCssHashes[id];
				themeDirectory;

				const sectionsLocation = path.join(themeDirectory, 'src', 'sections');
				const isInSections = subdir(sectionsLocation, id);
				const idParsed: path.ParsedPath = path.parse(id);
				const isSection =  path.parse(idParsed.dir).name === 'sections' || (idParsed.name === 'index' && path.parse(path.parse(idParsed.dir).dir).name === 'sections');
				compiled.js.meta = {
					preprocessResult: result,
					schema: schema,
					isSection,
					isInSections,
				};
				
				if (this.addWatchFile) {
					dependencies.forEach(this.addWatchFile);
				} else {
					compiled.js.dependencies = dependencies;
				}
				return compiled.js;

			} catch (err) {
				throw err;
			}
		},
		generateBundle: function generateBundle (opts, bundle)
		{

function outputLiquidAndSchemas (module)
{
		if (module.meta.isSection) {
			const that = this;
			function getChildSchemas (mod)
			{
				let mergedSchema = mod.meta.schema;
				const imports = mod.importedIds.filter(id => /\.(schema\.json|liquivelte)$/.test(id));
				// first we need to find and merge sub schemaJson
				imports.forEach(c =>
				{
					const moduleInfo = that.getModuleInfo(c);
					if (moduleInfo.meta && moduleInfo.meta.schema) {
						const childSchemas = getChildSchemas(moduleInfo);
						mergedSchema = mergeSchemas(mergedSchema, childSchemas);
					}
				});
				if (!mod.meta.isSection && !/\.schema\.json$/.test(mod.id)) {
					mod.meta.preprocessResult.liquidContent = stripSchema(mod.meta.preprocessResult.liquidContent);
				}
				return mergedSchema;
			}
			const finalSchema = getChildSchemas(module);
			module.meta.finalSchema = finalSchema;
			module.meta.preprocessResult.liquidContent =  module.meta.preprocessResult.liquidContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) => a.replace(content, JSON.stringify(finalSchema, null, 2)));
		}

	/* ---------------- NOW WE NEED TO OUTPUT ALL LIQUID CONTENT ---------------- */
	try {
		let {
			liquidImportsModule,
			subImportsRegistryModule,
			exportedVariables,
			exportedObjectVariables,
			rawIncludeRegistry,
			liquidContent,
			...rest
		} = module.meta.preprocessResult;
		let imp = module.meta.preprocessResult;
		let id = module.id;
		let themePath = themeDirectory;
		let filePath = path.parse(id);
		let parentFolderisSectionsOrSnippets = filePath.dir.split('/').includes('snippets') || filePath.dir.split('/').includes('sections');
		let parentFolderSectionsOrSnippets = filePath.dir.split('/').reduce((c, piece) => c.includes('snippets') || c.includes('sections') ? [...c] : [...c, piece], []).join('/');
		let isNodeModule = filePath.dir.split('/').includes('node_modules');
		let [pkgName] = filePath.dir.split('/').reduce((c, piece) => c.includes('node_modules') ? [piece] : [...c, piece], []);

		if (!parentFolderisSectionsOrSnippets && !isNodeModule) {
			throw new Error(`Could not determine parent folder for ${id}, liquivelte component should be in `);
		}
		const parentFolder = path.parse(parentFolderSectionsOrSnippets);
		let fileName = filePath.base;
		if (fileName == 'index.liquivelte' && parentFolder.name == 'sections') {
			// WE DO THIS BECAUSE WHEN A SECTION IS A FOLDER WE WANT TO USE THE INDEX.LIQUID FILE BUT FOLDER NAME FOR LIQUID FILE
			filePath = path.parse(filePath.dir);
			fileName = `${filePath.base}.liquid`;
		}

		let parentFolderName = parentFolder.base;
		// IF MODULE IS IN SECTIONS FOLDER BUT IS A SUB-MODULE WE MOVE IT INTO SNIPPETS INSTEAD OF SECTIONS
		if (parentFolderName == 'sections' && path.parse(filePath.dir).base !== 'sections') {
			parentFolderName = 'snippets';
		}
		if (isNodeModule) {
			parentFolderName = 'snippets';
		}
		const dest = path.resolve(themePath, parentFolderName, `${isNodeModule ? pkgName + '-' : ''}${fileName.replace('.liquivelte', '.liquid')}`);
		let slots = [];
		let svelte_selfs = [];

		const slugify = (str = "") =>
			str.toLowerCase().replace(/ /g, "_").replace(/\./g, "");

		const handle = slugify(`${isNodeModule ? pkgName + '_' : ''}${path.parse(id).name}`);
		
		let finalLiquidContent = imp.liquidContent.replace(/<slot\s*(name="([^"]+)")?[^/]*\/>/gi, function (a, named, name, offset)
		{
			if (named) {
				slots.push(name);
			}
			if (!named) {
				return `
		{%- if slot_default_${handle} != blank -%}
			{{- slot_default_${handle} -}}
		{%- endif -%}
	`;
			}
			return `
	{%- if slot_${name}_${handle} != blank -%}
		{{- slot_${name}_${handle} -}}
	{%- endif -%}
`;

		});

		finalLiquidContent = finalLiquidContent.replace(/<(\w+)((\s([^>]*\{\{-?[^\}]+>[^\}]+\}\})|[^>])+)>/gim, (a, tagName, content) =>
		{
			const dynamicClasses = {};
			content = content.replace(/\s(class:?([^=]+)?="([^"]+)")/gim, (_a, dynamicOrRegularClass, className, expression) =>
			{
				expression = expression.replace(/(\{\{-?)|(-?\}\})/g, '').trim();
				if (className) {
					dynamicClasses[expression] = [...(dynamicClasses[expression] || []), className];
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
	${Object.keys(dynamicClasses).map(exp => `  if ${exp.replace(/[\{\}]/gim, '').replace(/^[^a-zA-Z]/, '')} ${/[!\=]\=/.test(exp) ? '' : '!= blank'}
	assign dynamic_classes = dynamic_classes${dynamicClasses[exp].reduce((c, cls) => `${c} | append: ' ${cls}'`, '')}
	endif`).join(`
	`)}
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
	assign lv_props_arr = props | split: '-prsp-'
	for lv_prop in lv_props_arr
	assign lv_prop_and_value = lv_prop | split: '-kvsp-'
	assign lv_propName = lv_prop_and_value | first
	if lv_prop_and_value.size > 1
		assign lv_propValue = lv_prop_and_value | last | remove: '"'
	else
		assign lv_propValue = ''	
	endif
	if lv_propValue == '0'
		assign lv_propValue = lv_propValue | times: 1
	endif
	if lv_propValue contains '{' and lv_propValue contains '}'
	assign lv_propValue = lv_propValue | remove: '{' | remove: '}'
	assign lv_propValueArr = lv_propValue | split: ','
	for lv_entry in lv_propValueArr
	assign lv_key = lv_entry | split: ':' | first | strip | remove: '"'
	assign lv_value = lv_entry | split: ':' | last | strip | remove: '"'
	assign composite_key = lv_propName | append: '_' | append: lv_key
	${exportedObjectVariables.reduce((c, v) => `${c}
	${Object.keys(v[Object.keys(v)[0]]).reduce((cc, k) => `${cc}
	if composite_key == '${Object.keys(v)[0]}_${k}'
		assign ${Object.keys(v)[0]}_${k} = lv_value
	endif  
	`, '')}
	`, '')}
	endfor
	endif${exportedVariables.concat(liquidImportsModule).reduce((c, v) => `${c}
	if lv_propName == '${v}' and ${v} == blank
		assign ${v} = lv_propValue
	endif`, '')}
	endfor
	-%}`;
		const liquidPropsResetter = `{%- liquid
			${exportedObjectVariables.reduce((c, v) => `${c}
			${Object.keys(v[Object.keys(v)[0]]).reduce((cc, k) => `${cc}
			assign ${Object.keys(v)[0]}_${k} = null
			`, '')}
			`, '')}
			${exportedVariables.reduce((c, v) => `${c}
			assign ${v} = null`, '')}
			-%}`;
		
		const snippet_name = `${isNodeModule ? pkgName + '-' : ''}${path.parse(id).name}`;
		const slotsParser = `
			{%- liquid
				assign slot_contents_and_values = slot_contents | split: '-scs-'
				for content_and_value in slot_contents_and_values
					assign module_and_slotname = content_and_value | split: '-scvs-' | first
					assign lv_module = module_and_slotname | split: '-smns-' | first
					assign lv_name = module_and_slotname | split: '-smns-' | last
					assign lv_value = content_and_value | split: '-scvs-' | last
					${slots.map(name =>
						`if lv_module == '${snippet_name}' and lv_name == '${name}'
						assign slot_${name}_${handle} = lv_value | strip
					endif
					`).join('')}
					if lv_module == '${snippet_name}'
						assign slot_default_${handle} = lv_value | strip
					endif
				endfor
				-%}`;
		const slotsResetter = `{%- liquid 
			assign slot_default_${handle} = null
			${slots.map(name => `assign slot_${name}_${handle} = null
			`).join('')}
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
		const themeImports = (JSONparse(propScript.previousElementSibling.textContent));
		wrapper.svelteProps = wrapper.svelteProps || {};
		Object.keys(themeImports).forEach(key => {
			if(key == 'forloop_index' || key == 'component_index' || key == 'component_name') return;
			wrapper.svelteProps[key] = [
				...(wrapper.svelteProps[key] || []),
				{ forloop_index: themeImports.index, component_index: themeImports.component_index, component_name: themeImports.component_name, value: themeImports[key] }
			];
		});
	} catch (e) {
	const err = 'There was an error';
	console.error('there was an error parsing props json', e);
	wrapper.svelteProps = { ...wrapper.svelteProps, error: (wrapper.svelteProps.error || '') + err};
	}
	${imp.formIncludes.length ? imp.formIncludes.map(entry => `
	try{
	wrapper.svelteProps["form_inputs_${entry.id}"] = [...(wrapper.svelteProps["form_inputs_${entry.id}"] || []), ...window.liquivelte_form_inputs['form_inputs_${entry.id}'].map(e => htmlDecode(e)) ];
	} catch (e) {
	const err = 'Could not get form inputs, because it is not present in the liquid context please check for ${entry.id} in the ${fileName} file.';
	console.warn(err);
	wrapper.svelteProps = { ...wrapper.svelteProps, error: (wrapper.svelteProps.error || '') + err};
	}
	try{
	wrapper.svelteProps["form_props_${entry.id}"] = [...(wrapper.svelteProps["form_props_${entry.id}"] || []), ...window.liquivelte_form_props['form_props_${entry.id}'].map(e => parseProps(e)) ];
	} catch (e) {
	const err = 'Could not get form props, because it is not present in the liquid context please check for ${entry.id} in the ${fileName} file.';
	console.error(err);
	wrapper.svelteProps = { ...wrapper.svelteProps, error: (wrapper.svelteProps.error || '') + err};
	}
	`).join(';') : ''}
	${imp.rawIncludeRegistry.length ? imp.rawIncludeRegistry.map(entry => `
	try{
	wrapper.svelteProps["${entry.id}"] = [...(wrapper.svelteProps["${entry.id}"] || []), ...window.liquivelte_rawincludes['${entry.id}'].map(e => htmlDecode(e)) ];
	} catch (e) {
	const err = 'Could not grab liquid include, because it is not present in the liquid context please check for ${entry.id} in the ${fileName} file.';
	console.error(err);
	wrapper.svelteProps = { ...wrapper.svelteProps, error: (wrapper.svelteProps.error || '') + err};
	}

	`).join(';') : ''}

	// liquid expression cache
	[...wrapper.querySelectorAll('[liquivelte-value-cache]')].forEach(el => {
	let [filter, args, value] = el.getAttribute('liquivelte-value-cache').split('§');
	args = args.split(', ');
	args[0] = args[0].replace(/^"|\\\\|"$/g, '');
	wrapper.liquid_expression_cache = wrapper.liquid_expression_cache || {};
	wrapper.liquid_expression_cache[filter] = wrapper.liquid_expression_cache[filter] || new Map;
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
	${subImportsRegistryModule.some(v => v.id == 'sectionƒƒblocks') ? SECTION_BLOCKS_LIQUID : ''}	
	<script type="text/noscript" class="instance-data" >
		{% assign component_include_count = component_include_count | plus: 1 %}
		{
	${liquidImportsModule
				.map(v => 	v == 'cart' ?
					`"${v}": {{ cart_json }}`
					: `"${v}" : {{ ${v} | json }} `)
				.join(', ').trim()
			}
	${liquidImportsModule.length && subImportsRegistryModule.length ? ',' : ''}
	${subImportsRegistryModule
			.map(v =>
				v.id == 'sectionƒƒblocks' ?
					`"${v.id}": {{ section_blocks_json }}`
				: `"${v.id}": {{ ${v.importStatement} | json }} `)
				.join(', ').trim()
			}
		${liquidImportsModule.length || subImportsRegistryModule.length ? ',' : ''}
		"forloop_index": {{ forloop.index0 | default: 0 | json }},
		"component_index": {{ component_include_count | plus: component_include_depth }},
		"component_name": "${snippet_name}"
	}</script>
	`;

		finalLiquidContent = `
	${liquidPropsResetter}
	${liquidPropsParser}
	${slotsParser}
	{%- unless sub_include -%} 
	<div class="liquivelte-component ${fileName.replace('.liquivelte', '').replace('.liquid', '')}" data-liquivelte-component-name="${fileName.replace('.liquid', '')}">
		{% assign component_include_count_slot_offset = 0 %}
		{% assign component_include_count = 0 %}
		{% assign component_include_depth = 0 %}
		<script> window.cicR = 0; </script>
	{%- endunless -%}
	${finalLiquidContent}
	${propsContent}
	${propsParserScript}
	${liquidPropsResetter}
	${slotsResetter}
	
	{%- unless sub_include -%} 
	</div>
	{% assign component_include_count = 0 %}
	{%- endunless -%}
	`;

		/* -------------------------------------------------------------------------- */
		/*                  add css hashes to liquid content classes                  */
		/* -------------------------------------------------------------------------- */
		finalLiquidContent = imp.svelteCssHashes ? addCssClassesToLiquid(`svelte-${imp.svelteCssHashes}`, finalLiquidContent) : finalLiquidContent;
		/* -------------------------------------------------------------------------- */
		/*                            OUTPUT LIQUID CONTENT                           */
		/* -------------------------------------------------------------------------- */
		fs.outputFileSync(dest, finalLiquidContent.replace(/^\s*[$\n]/g, ''));
	} catch (err) {
		console.log('error in liquid generation ', err);
	}
} 
			if (pkg_export_errors.size > 0) {
				console.warn(`\n${PREFIX} The following packages did not export their \`package.json\` file so we could not check the "svelte" field. If you had difficulties importing svelte components from a package, then please contact the author and ask them to export the package.json file.\n`);
				console.warn(Array.from(pkg_export_errors, s => `- ${s}`).join('\n') + '\n');
			}

			[...this.moduleIds].filter(id => /\.liquivelte$/.test(id)).forEach(m =>
			{
				const module = this.getModuleInfo(m);
				outputLiquidAndSchemas.call(this, module);
			});
		
		const entryPoints = Object.keys(bundle).map(key => bundle[key]).filter(b => b.isEntry);

		/* -------------------- Save Svelte files for inspection -------------------- */
		Array.from(state.preprocess_results_cache).forEach(([key, value]) =>
		{
			fs.outputFileSync(key.replace(/\/src\/[^\/]+\//, '/src/.svelte/').replace('.liquivelte', ".svelte"), value.content);
		});
			
		const bundleModules = bundle[Object.keys(bundle).find(key => /\.js$/.test(key))].modules;
		const entryModule = Object.keys(bundleModules).find(key => /\.templates/.test(key));

		}
	};
};

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
			// console.log('style ', id);
      // Track the order that each stylesheet is imported.
      if (!order.includes(id)) {
        order.push(id);
			}
			
			const deps = getDeps(id.replace('.css', '.liquivelte'));

      // Keep track of every stylesheet
      // Check if it changed since last render
      if (styles[id] !== code && (styles[id] || code)) {
        styles[id] = code;
        changes++;
      }

      return ''
    },
		generateBundle: function (opts, bundle)
		{
			try {

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
			
			// const that = this;
			// function getAllModules (firstModule)
			// {
			// 	let allModules = [];
			// 	function getModules (m)
			// 	{
			// 		allModules = [...allModules, ...Object.keys(m.modules)];
			// 		Object.keys(m.modules).forEach(_m =>
			// 		{
			// 			if (bundle[_m]) {
			// 				getModules(_m);
			// 			}
			// 		});
			// 	}
			// 	getModules(firstModule);
			// 	return allModules;
			// }
			[...Object.keys(bundle).map(k => bundle[k])].filter(m => m.isEntry).map(m =>
			{
				const processedModules = new Set([m.fileName]);
				function getStyles (imp)
				{
					const styleModules = !bundle[imp] || !bundle[imp].modules ? [] : Object.keys(bundle[imp].modules).filter(m => m.slice(-4) === '.css');
					return styleModules.reduce((_c, m) => `${_c} ${styles[m]}`, '');
				}

				function getImportedStyles (m)
				{
					const moduleStyles = styles[`${(m.facadeModuleId || '').replace(/\.[^\.]+$/, '.css')}`]
					return [...m.imports, ...m.dynamicImports].reduce((c, imp) =>
					{
						const circular = processedModules.has(imp);
						processedModules.add(imp);
						let style = getStyles(imp);
						if (!circular && bundle[imp]) {
							style += getImportedStyles(bundle[imp]);
						}
						return `${c} ${style || ''}`;
						}, moduleStyles || '');
				}

				const css = getImportedStyles(m);

				this.emitFile({ type: 'asset', fileName: `${m.fileName.slice(0, -3)}.css`, source: css });
			});

      // Emit styles to file
      // this.emitFile({ type: 'asset', fileName: dest, source: css });
    
			} catch (err) {
				throw err;
			}
		}
  }
}

export function json(options) {
  if ( options === void 0 ) options = {};

  var filter = createFilter(options.include, options.exclude);
  var indent = 'indent' in options ? options.indent : '\t';
	const cache_emit = new Map;

  return {
    name: 'json',
		load (id)
		{
			return cache_emit.get(id) || null;
		},
    // eslint-disable-next-line no-shadow
    transform(json, id) {
      if (id.slice(-11) !== 'schema.json' || !filter(id)) { return null; }

			cache_emit.set(id, json);
			return {
				code: '',
				map: { mappings: '' },
				meta: {
					schema: parseSchemaJson(json) 
				}
			};
    }
  };
}