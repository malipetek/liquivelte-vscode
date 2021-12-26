import { uid } from 'uid';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import MagicString from 'magic-string';

let linesAdded = 0;
const replaceOperations: ReplaceOperation[] = [];

// function getLineFromOffset (lines: string[], offset: number) : number
// {
//   let lineCount = 0;
//   let charCount = 0;
//   while (charCount < offset) {
//     lineCount++;
//     const line = lines[lineCount];
//     charCount += line.length + (line === '' ? 1 : 0);
//   }
//   return lineCount;
// }

function getLineFromOffset (str: string, offset: number): number | undefined
{
  let line = 0;
  let pos = 0;
  while (pos < offset) {
    if (str[pos] === '\n') {
      line++;
    }
    pos++;
  }
  return line + 1;
}
export default function themeImportProcessor (script: string, ms: MagicString, liquidImportsModule: string[], subImportsRegistryModule: SubImportRegistryModule, previousReplace: ReplaceResult): ReplaceResult
{
  linesAdded = previousReplace.linesAdded;

  script.replace(/import\s+(.*?)(\..*?)?\s*from\s*['"]theme['"]/gim, (a, obj, subObject, offset) =>
  {
    const line = getLineFromOffset(script, offset);

    const id = `sub_import${uid()}`;
    if (subObject) {
      /* -------------------------------------------------------------------------- */
      /*              IMPORT FROM THEME IS SOMETHING LIKE product.image             */
      /* -------------------------------------------------------------------------- */
      const entry: SubImportsRegistryModuleEntry = {
        id: `${obj}${subObject.replace(/\./gi, '$$')}`,
        importStatement: `${obj}${subObject}`
      };

      // TODO: selection lines are not matching source of problem might be here
      subImportsRegistryModule.push(entry);
      ms.overwrite(offset, offset + a.length, `export let ${obj}${subObject.replace(/\./gi, '$$')}; \n${obj}${subObject} = ${obj}${subObject.replace(/\./gi, '$$')}`);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line + linesAdded, line + 1 + linesAdded]
        },
        explanation: `${obj}${subObject.replace(/\./gi, '$$')} will be imported as a top level prop. [var]$[var] syntax is for internal use.`
      });
      linesAdded += 1;
      return '';
    } else {
      /* -------------------------------------------------------------------------- */
      /*         IMPORT FROM THEME IS SOMETHING LIKE product from 'theme'           */
      /* -------------------------------------------------------------------------- */
      liquidImportsModule.push(obj);
      ms.remove(offset, offset + 'import '.length);
      ms.appendLeft(offset, 'export let ');
      ms.remove(offset + ('import ' + obj).length, offset + ('import ' + obj).length + ' from \'theme\''.length);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line + linesAdded]
        },
        explanation: `${obj} will be imported as a prop when initializing. Check the script tag in liquid built.`
      });
      // ms.overwrite(offset, offset + a.length, `export let ${obj}`);
      return '';
    }
  });

  const result: ReplaceResult = {
    magicString: ms,
    subImportsRegistryModule,
    liquidImportsModule,
    replaceOperations,
    linesAdded
  };

  return result;
}