// import { uid } from 'uid';
// import { ReplaceOperation } from '../../../types/replace-operation';
// import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
// import MagicString from 'magic-string';
// import getLineFromOffset from '../../../utils/get-line-from-offset';
// import createTagRegex from '../../../utils/create-tag-regex';
// import { stripArrowFunctions, putBackArrowFunctions } from '../../../utils/arrow-function-props';
// import toKebabCase from "../../../utils/to-kebab-case";
// import getNamedSlots from '../../../utils/get-named-slots';
// import parseProps from '../../../utils/parse-props';
// import path from 'path';

// function parseSvelteComponents(template) {
//   const uppercaseComponents = [];

//   // Use a regular expression to find all tag names in the template
//   const tagNameRegex = /<([A-Z][^\s\/>]*)/g;
//   let match;
//   while (match = tagNameRegex.exec(template)) {
//     const tagName = match[1];
//     // Check if the tag name is a custom component (starts with an uppercase letter)
//     if (tagName[0] === tagName[0].toUpperCase()) {
//       // Check if the component has any props
//       const propRegex = /([^\s\/>]+)="{{- [^}]+ -}}"/g;
//       let propMatch;
//       const props = [];
//       while (propMatch = propRegex.exec(template)) {
//         props.push(propMatch[1]);
//       }

//       // Check if the component has any spread props
//       const spreadPropRegex = /{[^}]+}/g;
//       let spreadPropMatch;
//       const spreadProps = [];
//       while (spreadPropMatch = spreadPropRegex.exec(template)) {
//         spreadProps.push(spreadPropMatch[0]);
//       }

//       // Add the component and its props to the list of uppercase components
//       const [importStatement] = findImportStatementsByVariableName(template, tagName);
//       uppercaseComponents.push({
//         tagName: tagName,
//         props: props,
//         spreadProps: spreadProps,
//         module: importStatement.moduleName
//       });
//     }
//   }

//   return uppercaseComponents;
// }

// function findImportStatementsByVariableName(code, variableName) {
//   const importStatements = [];

//   // Use a regular expression to find all import statements in the code
//   // This regular expression uses a non-greedy match (the "?" character after the "+" quantifier) to match only the first set of curly braces
//   const importRegex = /import (\{.+?\}) from ['|"](\S+)['|"];/g;
//   let match;
//   while (match = importRegex.exec(code)) {
//     const importedVariables = match[1];
//     const importPath = match[2];

//     // Extract the individual imported variables from the import statement
//     const variables = importedVariables
//       .substring(1, importedVariables.length - 1) // remove the curly braces from the string
//       .split(',')
//       .map(variable => variable.trim()); // remove any leading or trailing white space from each variable

//     // Check if any of the imported variables match the specified variable name
//     if (variables.includes(variableName)) {
//       // Extract the module name from the import path
//       const moduleName = importPath.split('/').pop();

//       importStatements.push({
//         importedVariables: variables,
//         importPath: importPath,
//         moduleName: moduleName
//       });
//     }
//   }

//   return importStatements;
// }

// export default function liquivelteImportProcessor (script: string, ms: MagicString, { liquidContent, liquidImportsModule , subImportsRegistryModule, rawIncludeRegistry, formIncludes, replaceOperations }: { liquidContent: string, liquidImportsModule: [] , subImportsRegistryModule: [], replaceOperations: any[], rawIncludeRegistry: any[], formIncludes: any[] }): ReplaceResult
// {

//   let modules = [];
//   const componentExpressions = parseSvelteComponents(script);
//   script.replace(/import\s+(.+)\s+from\s+['"](.+)\.liquivelte['"]/gi, (a, module, filename, offset) =>
//   {
//     const line = getLineFromOffset(script, offset);
    
//     filename = path.parse(filename).name;

//     const isNpmImport = !/^(\.{0,2}\/)/.test(filename);

//     modules.push({module, filename, isNpmImport: false });
    
//     return '';
//   });

//   modules.forEach(({ module, filename, isNpmImport }) =>
//   {
//     const { transformed, transformOffset } = stripArrowFunctions(liquidContent);
//     liquidContent = transformed.replace(createTagRegex(module, 'gi'), (a, props, children, offset) =>
//     {
//       let propsParsed = parseProps(props);
//       Object.keys(propsParsed).forEach(key => propsParsed[key] = putBackArrowFunctions(propsParsed[key]));

//       // count newlines
//       const line = getLineFromOffset(script, transformOffset(offset));
//       // ms.overwrite(offset, offset + a.length, a);
//       replaceOperations.push({
//         was: {
//           lines: [line]
//         },
//         operation: {
//           lines: [line]
//         },
//         explanation: `This is a liquvete module, its template be included in the theme side.`
//       });
//       if (propsParsed.spread) {
//         const [propsObject] = (script.match(new RegExp(`${propsParsed.spread}\\s*=\\s*(\\{[^\\}]+\\})`, 'gim')) || []);
//         delete propsParsed.spread;
//         if (propsObject) {
//           const spreadProps = eval(propsObject);
//           propsParsed = { ...propsParsed, ...spreadProps };
//         }
//       }
//       if (!children) {
//         return `
// {% comment %}
//   kvsp stands for "key value separator"
//   prsp stands for "props separator"
// {% endcomment %}
// {% capture props_${module} %}${Object.keys(propsParsed).map(key => `${key.replace(/\w+:/, '')}-kvsp-${/(\![^\s]*)/gi.test(propsParsed[key]) ?
//   `{%- unless ${propsParsed[key].replace(/\{\{-?\s*\!([^\s]*)\s*-?\}\}/gi, '$1')} -%}1{%- endunless -%}` :
//   propsParsed[key] 
//   }`).reduce((c, a) => `${c}${c ? '-prsp-' : ''}${a}`, '')}{% endcapture %}
// {% include '${filename}', liquivelte: true, props: props_${module}, sub_include: true %}
// {% assign props_${module} = '' %}`;
//       }

//       const { remainingContent, slotContents } = getNamedSlots(children);
//       return `
// {% comment %}
// kvsp stands for "key value separator"
// prsp stands for "props separator"
// {% endcomment %}
// {% comment %}
// scs stands for "slot component separator"
// scvs stands for "slot component value separator"
// smns stands for "slot module name separator"
// {% endcomment %}
// {% capture props_${module} %}${Object.keys(propsParsed).map(key => `${key.replace(/\w+:/, '')}-kvsp-${/(\![^\s]*)/gi.test(propsParsed[key]) ?
// `{%- unless ${propsParsed[key].replace(/\{\{-?\s*\!([^\s]*)\s*-?\}\}/gi, '$1')} -%}1{%- endunless -%}` :
// propsParsed[key]
// }`).reduce((c,a) => `${c}${c?'-prsp-':''}${a}`,'')}{% endcapture %}
// ${slotContents.reduce((c, slotEntry) => `${c}
// {% capture slot_content_${module}_${slotEntry.name} -%}${slotEntry.content}{%- endcapture %}
// {% assign slot_content_${module} = slot_content_${module} | append: '-scs-' | append: '${filename}' | append: '-smns-' | append: '${slotEntry.name}' | append: '-scvs-' | append: slot_content_${module}_${slotEntry.name} %}
// `, '')}
// {% capture slot_content_def_${module} -%}${remainingContent}{%- endcapture %}
// {% assign slot_content_${module} = slot_content_${module} | append: '-scs-' | append: '${filename}' | append: '-scvs-' | append: slot_content_def_${module} %}

// {% include '${filename}', liquivelte: true, props: props_${module}, slot_contents: slot_content_${module}, sub_include: true %}
// {% assign props = '' %}`;
//     });
//   });

//   const result: ReplaceResult = {
//     magicString: ms,
//     replaceOperations,
//     liquidContent
//   };

//   return result;
// }