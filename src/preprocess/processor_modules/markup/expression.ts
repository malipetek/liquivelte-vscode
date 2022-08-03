import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';

export default function expressionProcessor (markup: string, ms: MagicString, { replaceOperations }): ReplaceResult
{

  markup.replace(/\{\{-\s*(.*?)\s*(\|[^\|].*?)?-\}\}/gim, (a, expression, filter, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    if (filter) {
      if (/html/gi.test(filter)) {
        ms.overwrite(offset, offset + a.length, `{@html ${expression} || ''}`);

        replaceOperations.push({
          was: {
            lines: [line]
          },
          operation: {
            lines: [line]
          },
          explanation: `converted html filter`
        });

        return '';
      }

      /*
      * Convert expressions after pipe operator 
      * example: {{- "{{name}}" | html -}}
      */
      const exp = filter.match(/(\|\s*[^\|]+)(\:\s*[^\|]+)?/gi).map(filt =>
      {
        const filterReplaced = filt.replace(/\|\s*(\w+)\:?\s*([^\|]+)?/gi, '$1 $2');
        const filter_value = filterReplaced.match(/([\w\.]|(".*?")|('.*?'))+/gi);
        return { filter: filter_value[0], value: filter_value[1] || filter_value[2], second_value: filter_value[2] };
      }).reduce((c, e, i) =>
      {
        return `liquid.${e.filter}(${i == 0 ? expression : c}${e.value ? `, ${e.value}${e.second_value !== undefined ? `, ${e.second_value}` : ''}` : ''})`;
      }, '');

      ms.overwrite(offset, offset + a.length, `{ ${exp.replace(/\.size/gim, '.length')} }`);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line]
        },
        explanation: `Converted statement with filters, remember to include liquid.js`
      });

      return '';
    } else {
      ms.overwrite(offset, offset + a.length, `{ ${expression.replace(/\.size/gim, '.length')} || ''}`);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line]
        },
        explanation: `Converted statement`
      });

      return '';
    }
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations
  };

  return result;
}