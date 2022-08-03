import type MagicString from 'magic-string';

import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';


const replaceLiquid = (html) =>
{
  let offset = 0;
  let liquidOpen = false;
  let liquidTagOpen = false;
  let liquisStartOffset = 0;
  let liquidContents = [];
  let liquidContent = '';
  let chars = html.split('');
  for (let index = 0; index < chars.length; index++) {
    let char = chars[index];
    if (char === '%' && chars[index - 1] === '{') {
      liquidTagOpen = true;
      liquidOpen = html.slice(index, index + 9).indexOf('liquid') > -1;
      if (liquidOpen) {
        liquidContent += '{';
        liquisStartOffset = index - 1;
      }
    }
    
    if (liquidTagOpen && liquidOpen) {
      liquidContent += char;
    }
    if (liquidOpen && char === '%' && chars[index + 1] === '}') {
      liquidTagOpen = false;
      liquidContent += '}';
      if (liquidContent) {
        liquidContents.push({ content: liquidContent, length: liquidContent.length, offset: liquisStartOffset });
        liquidContent = '';
      }
    }
  }
  return liquidContents;
};

export default function removeLiquid (markup: string, ms: MagicString, { rawIncludeRegistry, replaceOperations }: { rawIncludeRegistry: any[], replaceOperations: any[] }): ReplaceResult {
  markup.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) => {
    // console.log(content, offset);
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, ``);
    
    let schema = {};
    try {
    schema = JSON.parse(content);
    } catch (e) {
      console.log(e);
    }
    replaceOperations.push({
      was: {
        lines: [...new Array(a.match(/\n/g).length).fill('').reduce((c, v, i) => [...c, line + i], [])]
      },
      operation: {
        lines: [line]
      },
      linesAdded: -1 * a.split(/\n/g).length + 1,
      explanation: `Schema is stripped but will be in the liquid output`
    });
    return '';
  });
  
  replaceLiquid(markup).forEach(({ content, offset, length }) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + length, ``);
    
    replaceOperations.push({
      was: {
        lines: [...new Array(content.match(/\n/g).length).fill('').reduce((c, v, i) => [...c, line + i], [])]
      },
      operation: {
        lines: [line]
      },
      linesAdded: -1 * content.split(/\n/g).length + 1,
      explanation: `Liquid expression is stripped but will be in the liquid output`
    });
    return '';
  });
  

  const result: ReplaceResult = {
    replaceOperations,
    magicString: ms,
    rawIncludeRegistry,
  };

  return result;
}