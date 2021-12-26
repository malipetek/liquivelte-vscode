import { preprocess } from 'svelte/compiler';
import MagicString from 'magic-string';
import { MagicStringOptions } from 'magic-string';
import expressionProcessor from './processor_modules/markup/expression';
import themeImportProcessor from './processor_modules/script/theme-import';
import ifStatementProcessor from './processor_modules/markup/ifstatement';

import { ReplaceOperation } from '../types/replace-operation';
import { ImportEntry } from '../types/import-entry';

const replaceOperations: ReplaceOperation[] = [];

export default async function liquifyTransformer (documentContent: string): Promise<{content: string, map: any, replaceOperations: any}>
{
  let liquidImportsModule: string[] = [];
  let subImportsRegistryModule: ImportEntry[] = [];

  const { code, map } = await preprocess(documentContent, {
    markup: async ({ content, filename }) =>
    {

      const options: MagicStringOptions = {
        filename,
        indentExclusionRanges: [],
      };
      
      let s = new MagicString(content, options);
      
      const expressionsResult = await expressionProcessor(content, s);
      
      s = expressionsResult.magicString;

      replaceOperations.push(...expressionsResult.replaceOperations);

      const importsResult = await themeImportProcessor(content, s, liquidImportsModule, subImportsRegistryModule, expressionsResult);
      
      s = importsResult.magicString;

      liquidImportsModule = importsResult.liquidImportsModule;
      subImportsRegistryModule = importsResult.subImportsRegistryModule;
      
      replaceOperations.push(...importsResult.replaceOperations);
      
      const ifStatementResult = await ifStatementProcessor(content, s, importsResult);
      
      replaceOperations.push(...ifStatementResult.replaceOperations);
      
      s = ifStatementResult.magicString;
      

      return {
        code: s.toString(),
        map: s.generateMap()
      };
    },
    script: ({ content, attributes, markup, filename }) =>
    {
      if (filename === undefined) {
        return {
          code: content,
          map: undefined
        };
      }
      const options: MagicStringOptions = {
        filename,
        indentExclusionRanges: [],
      };
      
      const s = new MagicString(content, options);

      return {
        code: s.toString(),
        map: s.generateMap()
      };
    }
  }, {
    filename: 'App.svelte'
  });

  return { content: code, map, replaceOperations };
}