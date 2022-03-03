import type MagicString from 'magic-string';

const replaceOperations: ReplaceOperation[] = [];
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';

export default function removeLiquid (markup: string, ms: MagicString, { rawIncludeRegistry }: { rawIncludeRegistry: any[] }): ReplaceResult {
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
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Schema is stripped but will be in the liquid output`
    });
    return '';
  });
  markup.replace(/\{%-*\s*liquid\s*([^*]+)-*%\}/gim, (a, content, offset) => {
    // console.log(content, offset);
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, ``);
    
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Liquid expression is stripped but will be in the liquid output`
    });
    return '';
  });
  

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    rawIncludeRegistry,
  };

  return result;
}