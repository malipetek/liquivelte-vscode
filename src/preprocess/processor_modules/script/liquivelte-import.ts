import { uid } from 'uid';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import MagicString from 'magic-string';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';
import { stripArrowFunctions, putBackArrowFunctions } from '../../../utils/arrow-function-props';
import toKebabCase from "../../../utils/to-kebab-case";
import parseProps from '../../../utils/parse-props';
import path from 'path';

export default function liquivelteImportProcessor (script: string, ms: MagicString, { liquidContent, liquidImportsModule , subImportsRegistryModule }: { liquidContent: string, liquidImportsModule: [] , subImportsRegistryModule: [] }): ReplaceResult
{
  const replaceOperations: ReplaceOperation[] = [];

  let modules = [];
  script.replace(/import\s+(.+)\s+from\s+['"](.+)\.liquivelte['"]/gi, (a, module, filename, offset) =>
  {
    const line = getLineFromOffset(script, offset);
    
    filename = path.parse(filename).name;

    modules.push({module, filename});

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

  modules.forEach(({ module, filename }) =>
  {
    module = module.replace(/\{|\}/g, '');
    stripArrowFunctions(script).replace(createTagRegex(module, 'gi'), (a, props, children, offset) => {
      // console.log(props, children, offset);
      // liquidImportsModule, subImportsRegistryModule
      const liquidImportProps = liquidImportsModule.reduce((c, imp) => `${c} ${imp}={${imp}}`, '') || '';
      // @ts-ignore
      const subImportProps = subImportsRegistryModule.reduce((c, imp) => `${c} ${imp.id}={${imp.id}}`, '') || '';
      ms.overwrite(offset, offset + a.length - children.length - `</${module}>`.length, `<${module} ${props || ''} ${liquidImportProps} ${subImportProps} >`);
      return '';  
    });

    liquidContent = stripArrowFunctions(liquidContent).replace(createTagRegex(module, 'gi'), (a, props, children, offset) =>
    {
      let propsParsed = parseProps(props);
      Object.keys(propsParsed).forEach(key => propsParsed[key] = putBackArrowFunctions(propsParsed[key]));

      // count newlines
      const line = getLineFromOffset(script, offset);
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
      return `
{% comment %}
kvsp stands for "key value separator"
prsp stands for "props separator"
{% endcomment %}
{% comment %}
scs stands for "slot component separator"
scvs stands for "slot component value separator"
{% endcomment %}
{% capture props %}${Object.keys(propsParsed).map(key => `${key}-kvsp-${propsParsed[key]}`).reduce((c,a) => `${c}${c?'-prsp-':''}${a}`,'')}{% endcapture %}
{% capture slot_content_${module} %}${children}{% endcapture %}
{% assign slot_contents = slot_contents | append: '-scs-' | append: '${filename}' | append: '-scvs-' | append: slot_content_${module} %}

{% include 'svelte', module: '${filename}', props: props, sub_include: true %}
{% assign props = '' %}`;
    });
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    liquidContent
  };

  return result;
}