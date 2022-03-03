import * as vscode from 'vscode';
/* eslint-disable @typescript-eslint/naming-convention */
import { preprocess, compile } from 'svelte/compiler';
import MagicString from 'magic-string';
import { MagicStringOptions } from 'magic-string';
import expressionProcessor from './processor_modules/markup/expression';
import themeImportProcessor from './processor_modules/script/theme-import';
import liquivelteImportProcessor from './processor_modules/script/liquivelte-import';
import ifStatementProcessor from './processor_modules/markup/ifstatement';
import rawIncludeProcessor from './processor_modules/markup/rawinclude';
import removeLiquid from './processor_modules/markup/removeliquid';

import path from 'path';

import { ReplaceOperation } from '../types/replace-operation';
import { ImportEntry } from '../types/import-entry';
import stripTags from '../utils/strip-tags';

function applyReplaces (replacers, content, filename)
{
  const replaceOperations: ReplaceOperation[] = [];
  let liquidImportsModule: string[] = [];
  let subImportsRegistryModule: ImportEntry[] = [];
  let rawIncludeRegistry: any[] = [];
  let liquidContent = content;

  const options: MagicStringOptions = {
    filename,
    indentExclusionRanges: [],
  };
  
  let magicString = new MagicString(content, options);

  for (let replacer of replacers) {
    const replaceResult = replacer(content, magicString, { liquidContent, liquidImportsModule , subImportsRegistryModule, rawIncludeRegistry, replaceOperations });
    // magicString = replaceResult.magicString;
    liquidContent = replaceResult.liquidContent ? replaceResult.liquidContent : liquidContent;
    // liquidImportsModule = [...liquidImportsModule, ...(replaceResult.liquidImportsModule || [])];
    // subImportsRegistryModule = [...subImportsRegistryModule, ...(replaceResult.subImportsRegistryModule || [])];
    // rawIncludeRegistry = [...rawIncludeRegistry, ...(replaceResult.rawIncludeRegistry || [])];
  }
  return { magicString, replaceOperations, liquidContent, subImportsRegistryModule, liquidImportsModule, rawIncludeRegistry };
}


export function transformSync (content: string)
{
  const RR = applyReplaces([
    themeImportProcessor,
    expressionProcessor,
    liquivelteImportProcessor,
    ifStatementProcessor,
    rawIncludeProcessor,
    removeLiquid
  ], content, 'noname');

  RR.magicString.append(`
  ${RR.rawIncludeRegistry.reduce((acc, rawInclude) => `${acc}
  export let ${rawInclude.id}`, '')}`);

    return {
      code: RR.magicString.toString(),
      map: RR.magicString.generateMap(),
      ...RR,
    };
}

export default async function liquivelteTransformer (documentContent: string, fileUri: vscode.Uri): Promise<{ content: string, map: any, replaceOperations: any, liquidImportsModule, subImportsRegistryModule, exportedObjectVariables, exportedVariables, liquidContent: string }>
{
  let liquidContent = documentContent;
  const file = path.parse(fileUri.fsPath);
  

  interface RRType
  {
    magicString: MagicString;
    exportedVariables?: string[];
    exportedObjectVariables?: any[];
    replaceOperations: ReplaceOperation[];
    liquidImportsModule: string[];
    subImportsRegistryModule: ImportEntry[];
    rawIncludeRegistry: any[];
    liquidContent: string;
  }
  let RR: RRType = {
    magicString: new MagicString(documentContent),
    replaceOperations: [],
    liquidContent: '',
    subImportsRegistryModule: [],
    liquidImportsModule: [],
    rawIncludeRegistry: []
  };

  const { code, map } = await preprocess(documentContent, {
    markup: async ({ content, filename }) =>
    {
      RR = await applyReplaces([
        themeImportProcessor,
        expressionProcessor,
        liquivelteImportProcessor,
        ifStatementProcessor,
        rawIncludeProcessor,
        removeLiquid
      ], content, filename);

      return {
        code: RR.magicString.toString(),
        map: RR.magicString.generateMap()
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

      s.append(`${RR.rawIncludeRegistry.reduce((acc, rawInclude) => `${acc}
export let ${rawInclude.id}`, '')}`);

      return {
        code: s.toString(),
        map: s.generateMap()
      };
    }
  }, {
    filename: `${file.name}.svelte`,
  });

  RR.exportedVariables = [];
  RR.exportedObjectVariables = [];
  documentContent.replace(/export\slet\s([^=]+)\s*=\s*(\{[^\}]+\})?/gi, (a, v, o) => {

    if (o) {
      RR.exportedObjectVariables.push({ [v.trim()]: eval(`(() => (${o}))()`) });
    } else {
      RR.exportedVariables.push(v.trim());
    }
    return '';
  });

  // replaceOperations,
  // liquidContent,
  // subImportsRegistryModule,
  // liquidImportsModule,
  // rawIncludeRegistry

  RR.liquidContent = stripTags(RR.liquidContent); 
  
  return { content: code, map, exportedVariables: [], exportedObjectVariables: [], ...RR };
}
