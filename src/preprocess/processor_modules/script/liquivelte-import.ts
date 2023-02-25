import { uid } from 'uid';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import MagicString from 'magic-string';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';
import { stripArrowFunctions, putBackArrowFunctions } from '../../../utils/arrow-function-props';
import toKebabCase from "../../../utils/to-kebab-case";
import getNamedSlots from '../../../utils/get-named-slots';
import parseProps from '../../../utils/parse-props';
import parseSvelteComponents from '../../../utils/parse-svelte-components';
import path from 'path';

export default function liquivelteImportProcessor (script: string, ms: MagicString, { liquidContent, liquidImportsModule , subImportsRegistryModule, rawIncludeRegistry, formIncludes, replaceOperations, filename }: { liquidContent: string, liquidImportsModule: [] , subImportsRegistryModule: [], replaceOperations: any[], rawIncludeRegistry: any[], formIncludes: any[], filename: string }): ReplaceResult
{

  let modules = [];

  const componentExpressions = parseSvelteComponents(script);

  script.replace(/import\s+(.+)\s+from\s+['"](.+)['"]/gi, (a, module, importname, offset) =>
  {
    let filename = importname.replace('.liquivelte', '');
    const isLiquivelte = /\.liquivelte/.test(importname);
    const isSvelte = /\.svelte/.test(importname);
    const isNpmImport = !/^(\.{0,2}\/)/.test(importname);

    const line = getLineFromOffset(script, offset);
    
    filename = path.parse(filename).name;

    if (/^\{/.test(module)) {
      const spreadModule = module.replace(/\{|\}|\s/g, '').split(',');
      spreadModule.forEach(mod => modules.push({ module: mod, filename, isNpmImport, isSvelte, isLiquivelte }));
    } else {
      modules.push({ module, filename, isNpmImport, isSvelte, isLiquivelte });
    }

    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `imported liquivelte modules
      {% capture slot_content %}{% endcapture %} be included in the theme side.`
    });
    return '';
  });

  
  // (componentExpressions || [])
  //   .map(exp => { exp, mod: modules.find(m => m.module == exp.tagName) })
  //   .filter(e => e.mod)
  //   .map({exp, mod} =>
  //   {
  //     return {
  //       base: exp.module,
  //       module: exp.tagName, filename: `${exp.module}-${toKebabCase(exp.tagName).toLowerCase()}`,
  //       isNpmImport: mod.isNpmImport,
  //       isSvelte
  //     }
  //   })
  modules
    .filter(importEntry => importEntry.isLiquivelte || importEntry.isNpmImport)
    .map(importEntry =>
    {
      let expression = componentExpressions.find(exp => exp.tagName == importEntry.module);

      if (importEntry.isNpmImport && !expression) {
        return false;
      }
      if (importEntry.isNpmImport) {
        return {
          ...importEntry,
          base: expression.module,
          module: expression.tagName,
          filename: `${expression.module}-${toKebabCase(expression.tagName).toLowerCase()}`,
        };
      }
      return importEntry;
    })
  .filter(entry => !!entry)
  .forEach(({ module, filename, base, isNpmImport }) =>
  {
    {
      module = module.replace(/\{|\}/g, '');
      const { transformed, transformOffset } = stripArrowFunctions(script);
      transformed.replace(createTagRegex(module, 'gi'), (a, props, children, offset) =>
      {
        // console.log(props, children, offset);
        // liquidImportsModule, subImportsRegistryModule
        props = (props||'').replace(/\{\{-\s*(.*?)\s*(\|[^\|].*?)?-\}\}/gim, (_a, expression, filter, offset) =>
        {
          return `{ ${expression.replace(/\.size/gim, '.length')} }`;
        });
        if (!children) {
          ms.overwrite(transformOffset(offset), transformOffset(offset) + a.length, `<${module} ${putBackArrowFunctions(props || '')} />`);
        } else {
          ms.overwrite(transformOffset(offset), transformOffset(offset) + a.length - children.length - `</${module}>`.length, `<${module} ${putBackArrowFunctions(props || '')} >`);
        }

        return '';
      });
    }

    const { transformed, transformOffset } = stripArrowFunctions(liquidContent);
    liquidContent = transformed.replace(createTagRegex(module, 'gi'), (a, props, children, offset) =>
    {
      let propsParsed = parseProps(props);
      Object.keys(propsParsed).forEach(key => propsParsed[key] = putBackArrowFunctions(propsParsed[key]));

      // count newlines
      const line = getLineFromOffset(script, transformOffset(offset));
      // ms.overwrite(offset, offset + a.length, a);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line]
        },
        explanation: `This is a liquvete module, its template be included in the theme side.`
      });
      if (propsParsed.spread) {
        const [propsObject] = (script.match(new RegExp(`${propsParsed.spread}\\s*=\\s*(\\{[^\\}]+\\})`, 'gim')) || []);
        delete propsParsed.spread;
        if (propsObject) {
          const spreadProps = eval(propsObject);
          propsParsed = { ...propsParsed, ...spreadProps };
        }
      }
      if (!children) {
        return `
{% comment %}
  kvsp stands for "key value separator"
  prsp stands for "props separator"
{% endcomment %}
{% capture props_${module} %}${Object.keys(propsParsed).map(key => `${key.replace(/\w+:/, '')}-kvsp-${/(\![^\s]*)/gi.test(propsParsed[key]) ?
`{%- unless ${propsParsed[key].replace(/\{\{-?\s*\!([^\s]*)\s*-?\}\}/gi, '$1')} -%}1{%- endunless -%}` :
propsParsed[key]
}`).reduce((c, a) => `${c}${c ? '-prsp-' : ''}${a}`, '')}{% endcapture %}
{% assign modulename = basename | append: '${filename}' %}
{% include modulename, liquivelte: true, props: props_${module}, sub_include: true, basename: '${isNpmImport ? `${base}-` : ''}' ${Object.keys(propsParsed).filter(key => /^\{\{/.test(propsParsed[key]) && !/\|/.test(propsParsed[key])).map(key => propsParsed[key].replace(/\{\{(.+)\}\}/, `, ${key}: $1`)).join(' ') } %}
{% assign props = '' %}`;
      }

      const { remainingContent, slotContents } = getNamedSlots(children);
      return `
{% comment %}
kvsp stands for "key value separator"
prsp stands for "props separator"
{% endcomment %}
{% comment %}
scs stands for "slot component separator"
scvs stands for "slot component value separator"
smns stands for "slot module name separator"
{% endcomment %}
{% capture props_${module} %}${Object.keys(propsParsed).map(key => `${key.replace(/\w+:/, '')}-kvsp-${/(\![^\s]*)/gi.test(propsParsed[key]) ?
`{%- unless ${propsParsed[key].replace(/\{\{-?\s*\!([^\s]*)\s*-?\}\}/gi, '$1')} -%}1{%- endunless -%}` :
propsParsed[key]
}`).reduce((c,a) => `${c}${c?'-prsp-':''}${a}`,'')}{% endcapture %}
{%- assign component_include_count_before_slots = component_include_count -%}
${slotContents.reduce((c, slotEntry) => `${c}
{%- capture slot_content_${module}_${slotEntry.name} -%}<script> console.log('${module}', 'component_include_depth adding 1', {{ component_include_depth | json }}); </script>{% assign component_include_depth = component_include_depth | plus: 1 %}<script> console.log('${module}', 'component_include_depth added 1', {{ component_include_depth | json }}); </script>${slotEntry.content}{%- endcapture -%}{% assign component_include_depth = component_include_depth | minus: 1 %}
{% assign slot_content_${module} = slot_content_${module} | append: '-scs-' | append: '${filename}' | append: '-smns-' | append: '${slotEntry.name}' | append: '-scvs-' | append: slot_content_${module}_${slotEntry.name} %}
`, '')}
{%- capture slot_content_def_${module} -%}<script> console.log('${module}', 'component_include_depth adding 1', {{ component_include_depth | json }}); </script>{% assign component_include_depth = component_include_depth | plus: 1 %}<script> console.log('${module}', 'component_include_depth added 1', {{ component_include_depth | json }}); </script>${remainingContent}{%- endcapture -%}{% assign component_include_depth = component_include_depth | minus: 1 %}
{%- assign component_include_count_slot_offset = component_include_count | minus: component_include_count_before_slots -%}
{% assign modulename = basename | append: '${filename}' %}
{% assign slot_content_${module} = slot_content_${module} | append: '-scs-' | append: modulename | append: '-scvs-' | append: slot_content_def_${module} %}
{% include modulename, liquivelte: true, props: props_${module}, sub_include: true, slot_contents: slot_content_${module}, basename: '${isNpmImport ? `${base}-` : ''}' ${Object.keys(propsParsed).filter(key => /^\{\{/.test(propsParsed[key]) && !/\|/.test(propsParsed[key])).map(key => propsParsed[key].replace(/\{\{(.+)\}\}/, `, ${key}: $1`)).join(' ') } %}
{% assign slot_content_${module} = '' %}
{% assign props = '' %}`;
    });
  });


/* ******************************************************************
 ****** Including snippet itself within breaks shopify big time *****
 ****************************************************************** */
// const { transformed, transformOffset } = stripArrowFunctions(liquidContent);

//   liquidContent = transformed.replace(createTagRegex('svelte:self', 'gi'), (a, props, children, offset) =>
//   {
//     let propsParsed = parseProps(props);
//     Object.keys(propsParsed).forEach(key => propsParsed[key] = putBackArrowFunctions(propsParsed[key]));

//     // count newlines
//     const line = getLineFromOffset(script, transformOffset(offset));
//     // ms.overwrite(offset, offset + a.length, a);
//     replaceOperations.push({
//       was: {
//         lines: [line]
//       },
//       operation: {
//         lines: [line]
//       },
//       explanation: `This is a liquvete module, its template be included in the theme side.`
//     });
//     if (propsParsed.spread) {
//       const [propsObject] = (script.match(new RegExp(`${propsParsed.spread}\\s*=\\s*(\\{[^\\}]+\\})`, 'gim')) || []);
//       delete propsParsed.spread;
//       if (propsObject) {
//         const spreadProps = eval(propsObject);
//         propsParsed = { ...propsParsed, ...spreadProps };
//       }
//     }
//     const module = 'self';
//     if (!children) {
//       return `
// {% comment %}
//   kvsp stands for "key value separator"
//   prsp stands for "props separator"
// {% endcomment %}
// {% capture props_${module} %}${Object.keys(propsParsed).map(key => `${key.replace(/\w+:/, '')}-kvsp-${/(\![^\s]*)/gi.test(propsParsed[key]) ?
//         `{%- unless ${propsParsed[key].replace(/\{\{-?\s*\!([^\s]*)\s*-?\}\}/gi, '$1')} -%}1{%- endunless -%}` :
//         propsParsed[key]
//         }`).reduce((c, a) => `${c}${c ? '-prsp-' : ''}${a}`, '')}{% endcapture %}
// {% assign modulename = basename | append: '${filename.replace('.svelte', '')}' %}
// {% include modulename, liquivelte: true, props: props_${module}, sub_include: true, basename: basename ${Object.keys(propsParsed).filter(key => /^\{\{/.test(propsParsed[key]) && !/\|/.test(propsParsed[key])).map(key => propsParsed[key].replace(/\{\{(.+)\}\}/, `, ${key}: $1`)).join(' ')} %}
// {% assign props = '' %}`;
//     }
//   });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    liquidContent
  };

  return result;
}