import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import { uid } from 'uid';

export default function formProcessor (markup: string, ms: MagicString, { replaceOperations, formIncludes, liquidContent }): ReplaceResult
{
  liquidContent = liquidContent.replace(/<(form)(\s[^>]+)>/gim, (a, tagName, content, offset) => {
    const line = getLineFromOffset(markup, offset);

    let type = '';
    let prop = '';
    const hasType = /type="([^"]+)"/gim.test(content);
    const hasProp = /prop="([^"]+)"/gim.test(content);
    if (hasType) {
      content = content.replace(/\stype="([^"]+)"/gim, (a, t) => {
        type = t;
        return ``;
      });
    } else {
      return '';
    }
    if (hasProp) {
      content = content.replace(/\prop="([^"]+)"/gim, (a, t) => {
        prop = t;
        return ``;
      });
    }
    var id = `f${uid()}`;
      formIncludes.push({
        id
      });
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line]
        },
        explanation: `form props will be in the liquid output and will persist`
      });

      ms.overwrite(offset, offset + a.length, `<${tagName} ${content} {...form_props_${id}[index || 0]}>
  {@html form_inputs_${id}[index || 0]}`);
    // console.log(tagName, hasClass);
    return `{% capture form_content %}
    {% form '${type}', ${prop} %}%FC%{% endform %}
    {% endcapture %}
    {% liquid 
      assign form_props = form_content | split: '<form' | last | split: '>' | first
      assign additional_inputs = ''
      assign pieces = form_content | split: '>'
      for piece in pieces
        if piece contains '<input'
          assign additional_inputs = additional_inputs | append: piece | append: '>'
        endif
      endfor
    %}
  <${tagName} ${content}{{- form_props -}} >
  {{- additional_inputs -}}
  <script liquivelte-keep> 
    window.liquivelte_form_inputs = window.liquivelte_form_inputs || {};
    window.liquivelte_form_props = window.liquivelte_form_props || {};
    window.liquivelte_form_inputs['form_inputs_${id}'] = [...(window.liquivelte_form_inputs['form_inputs_${id}'] || []),\`{{ additional_inputs | escape }}\`];
    window.liquivelte_form_props['form_props_${id}'] = [...(window.liquivelte_form_props['form_props_${id}'] || []),\`{{ form_props }}\`];
    document.currentScript.remove();
  </script>
  {% assign additional_inputs = '' %}`;
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    liquidContent
  };

  return result;
}