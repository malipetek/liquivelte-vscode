import type MagicString from 'magic-string';
import { uid } from 'uid';

const replaceOperations: ReplaceOperation[] = [];
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';

export default function rawIncludeProcessor (markup: string, ms: MagicString, { rawIncludeRegistry, replaceOperations }: { rawIncludeRegistry: any[], replaceOperations: any[] }): ReplaceResult {
  markup.replace(/\{%-*\s*(include)\s*['"](.*?)['"]\s*(.*?)\s*-*%\}/gim, (a, keyword, include, rest, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    var id = `rawinclude_${uid()}`;
    rawIncludeRegistry.push({
      id
    });
    ms.overwrite(offset, offset + a.length, `{@html ${id}[(global.index || 0)]}`);
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Snippet includes are treated like captured values`
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