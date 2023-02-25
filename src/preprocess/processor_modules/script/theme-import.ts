import uid from '../../../utils/uid';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import MagicString from 'magic-string';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';

export default function themeImportProcessor (script: string, ms: MagicString, { liquidImportsModule, subImportsRegistryModule, replaceOperations, filename }: { liquidImportsModule?: string[], subImportsRegistryModule?: SubImportRegistryModule, replaceOperations: any[], filename?: string}): ReplaceResult
{  
  script.replace(/import\s+(.*?)(\..*?)?\s*from\s*['"]theme(.*)['"]/gim, (a, obj, subObject, afterTheme, offset) =>
  {
    const line = getLineFromOffset(script, offset);

    const id = `sub_import${uid(a)}`;
    if (subObject) {
      /* -------------------------------------------------------------------------- */
      /*              IMPORT FROM THEME IS SOMETHING LIKE product.image             */
      /* -------------------------------------------------------------------------- */
      const entry: SubImportsRegistryModuleEntry = {
        id: `${obj}${subObject.replace(/\./gi, 'ƒƒ')}`,
        importStatement: `${obj}${subObject}`
      };

      if (!subImportsRegistryModule.some(subImport => subImport.id === entry.id)) {
        subImportsRegistryModule.push(entry);
      }
      ms.overwrite(offset, offset + a.length, `export let ${obj}${subObject.replace(/\./gi, 'ƒƒ')}; \ntry{${obj} = ${obj} || {};}catch(e){/*whatever*/}\n${obj}${subObject} = themeImports['${obj}${subObject.replace(/\./gi, 'ƒƒ')}'].find(e => e.component_index == fc(themeImports['${obj}${subObject.replace(/\./gi, 'ƒƒ')}'].map(e => e.component_index), cic, importsSeek)).value`);
      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line, line + 1]
        },
        linesAdded: 1,
        explanation: `${obj}${subObject.replace(/\./gi, 'ƒƒ')} will be imported as a top level prop. [var]ƒ[var] syntax is for internal use.`
      });
      return '';
    } else {
      /* -------------------------------------------------------------------------- */
      /*         IMPORT FROM THEME IS SOMETHING LIKE product from 'theme'           */
      /* -------------------------------------------------------------------------- */
      if (!liquidImportsModule.some(liquidImport => liquidImport === obj)) {
        liquidImportsModule.push(obj);
      }
      ms.overwrite(offset, offset + a.length, `export let ${obj} = themeImports['${obj}'].find(e => e.component_index == fc(themeImports['${obj}'].map(e => e.component_index), cic, importsSeek)).value`);

      replaceOperations.push({
        was: {
          lines: [line]
        },
        operation: {
          lines: [line]
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
  };

  return result;
}