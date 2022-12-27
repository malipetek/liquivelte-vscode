import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';

export default function expressionProcessor (markup: string, ms: MagicString, { replaceOperations, liquidContent }): ReplaceResult
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
        let filter_value = filterReplaced.match(/([\w\.]:?|(".*?")|('.*?'))+/gi);
        let next_consumed = false;
        filter_value = filter_value.reduce((c, v, i) =>
        {
          if (/:/.test(v)) {
            next_consumed = true;
            return [...c, JSON.stringify({ [v.replace(':', '')]: filter_value[i + 1] })];
          }
          if (next_consumed) {
            next_consumed = false;
            return c;
          }
          return [...c, v];
        }, []);

        return { filter: filter_value[0], value: filter_value[1] || filter_value[2], second_value: filter_value[2] };
      }).reduce((c, e, i) =>
      {
        return `liquid.${e.filter}(${i == 0 ? expression : c}${e.value ? `, ${e.value}${e.second_value !== undefined ? `, ${e.second_value}` : ''}` : ''})`;
      }, '');

      ms.overwrite(offset, offset + a.length, `{ ${exp.replace(/\.size/gim, '.length').replace(/\sand\s/gim, ' && ').replace(/\sor\s/gim, ' || ')} }`);
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
      ms.overwrite(offset, offset + a.length, `{ ${expression.replace(/\.size/gim, '.length').replace(/\sand\s/gim, ' && ').replace(/\sor\s/gim, ' || ')} }`);
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

  liquidContent = liquidContent.replace(/(\w+)=['"]?\{\{-\s*(.*?)\s*(\|[^\|].*?)?-\}\}['"]?/gim, (a, prop, expression, filter, offset) =>
  {
    if (filter) {
      const exp = filter.match(/(\|\s*[^\|]+)(\:\s*[^\|]+)?/gi).map(filt =>
        {
          const filterReplaced = filt.replace(/\|\s*(\w+)\:?\s*([^\|]+)?/gi, '$1 $2');
          const filter_value = filterReplaced.match(/([\w\.]|(".*?")|('.*?'))+/gi);
          return { filter: filter_value[0], value: filter_value[1] || filter_value[2], second_value: filter_value[2] };
        }).reduce((c, e, i) =>
        {
          return `${e.filter}§{{${i == 0 ? expression : c}}}${e.value ? `, {{${e.value}}}${e.second_value !== undefined ? `, {{${e.second_value}}}` : ''}` : ''}`;
        }, '');
        return a + ` liquivelte-value-cache="${exp}§{{${expression}${filter} }}"`;
    }
    return a;
  });

  liquidContent = liquidContent.replace(/\{\{-\s*(.*?)\s*(\|[^\|].*?)?-\}\}/gim, (a, expression, filter, offset) =>
  { 
    return a.replace(/\{\{-/, '{{').replace(/-\}\}/, '}}');
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    liquidContent
  };

  return result;
}