import type MagicString from 'magic-string';
import uid from '../../../utils/uid';

const replaceOperations: ReplaceOperation[] = [];
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';

export default function rawIncludeProcessor (markup: string, ms: MagicString, { liquidContent, rawIncludeRegistry, replaceOperations }: { liquidContent: string, rawIncludeRegistry: any[], replaceOperations: any[] }): ReplaceResult {
  let rawIncludes = [];
  markup.replace(/\{%-*\s*(include)\s*['"](.*?)['"]\s*(.*?)\s*-*%\}/gim, (a, keyword, include, rest, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    var id = `rawinclude_${uid(a)}`;
    rawIncludeRegistry.push({
      id,
      include,
      rest
    });
    rawIncludes.push(id);
    ms.overwrite(offset, offset + a.length, `{@html ${id}[index || 0]}`);
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Snippet includes are treated like captured values`
    });
    return ``;
  });

  let index = 0;
  liquidContent = liquidContent.replace(/\{%-*\s*(include)\s*['"](.*?)['"]\s*(.*?)\s*-*%\}/gim, (a, keyword, include, rest, offset) =>
  { 
    const id = rawIncludes[index];
    index++;
    return `
    {%- capture rawinclude -%}{% include '${include}' ${rest} %}{%- endcapture -%}
  <script liquivelte-keep liquivelte-eval>
  window.liquivelte_rawincludes = window.liquivelte_rawincludes || {};
  window.liquivelte_rawincludes['${id}'] = [...(window.liquivelte_rawincludes['${id}'] || []),\`{{ rawinclude | escape | strip_newlines }}\`];
  if(document.currentScript){
    document.currentScript.remove();
  }</script>
  {%- assign rawinclude = '' -%}`;
  });


  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    rawIncludeRegistry,
    liquidContent
  };

  return result;
}