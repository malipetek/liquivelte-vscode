// @ts-nocheck
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
import formProcessor from './processor_modules/markup/formincludes';
import getLineFromOffset from '../utils/get-line-from-offset';

import path from 'path';

import { ReplaceOperation } from '../types/replace-operation';
import { ImportEntry } from '../types/import-entry';
import stripTags from '../utils/strip-tags';

function applyReplaces (replacers, content, filename, RR: RRType)
{
  const replaceOperations: ReplaceOperation[] = [];
  let liquidImportsModule: string[] = [...RR.liquidImportsModule];
  let subImportsRegistryModule: ImportEntry[] = [...RR.subImportsRegistryModule];
  let rawIncludeRegistry: any[] = [...RR.rawIncludeRegistry];
  let formIncludes: any[] = [...RR.formIncludes];
  let liquidContent = content;

  const options: MagicStringOptions = {
    filename,
    indentExclusionRanges: [],
  };
  
  let magicString = new MagicString(content, options);

  for (let replacer of replacers) {
    const replaceResult = replacer(content, magicString, { liquidContent, liquidImportsModule , subImportsRegistryModule, rawIncludeRegistry, replaceOperations, formIncludes });
    // magicString = replaceResult.magicString;
    liquidContent = replaceResult.liquidContent ? replaceResult.liquidContent : liquidContent;
    // liquidImportsModule = [...liquidImportsModule, ...(replaceResult.liquidImportsModule || [])];
    // subImportsRegistryModule = [...subImportsRegistryModule, ...(replaceResult.subImportsRegistryModule || [])];
    // rawIncludeRegistry = [...rawIncludeRegistry, ...(replaceResult.rawIncludeRegistry || [])];
  }
  return { magicString, replaceOperations, liquidContent, subImportsRegistryModule, liquidImportsModule, rawIncludeRegistry, formIncludes };
}


export function transformSync (content: string)
{
  let RR: RRType = {
    magicString: new MagicString(content),
    replaceOperations: [],
    liquidImportsModule: [],
    subImportsRegistryModule: [],
    rawIncludeRegistry: [],
    liquidContent: content,
    formIncludes: [],
  };

  RR = applyReplaces([
    themeImportProcessor,
    expressionProcessor,
    formProcessor,
    rawIncludeProcessor,
    ifStatementProcessor,
    liquivelteImportProcessor,
    removeLiquid,
  ], content, 'noname', RR);

  RR.magicString.append(`
  ${RR.rawIncludeRegistry.reduce((acc, rawInclude) => `${acc}
  export let ${rawInclude.id}`, '')}`);

    return {
      code: RR.magicString.toString(),
      map: RR.magicString.generateMap(),
      ...RR,
    };
}

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
  formIncludes: any[];
}

export default async function liquivelteTransformer (documentContent: string, fileUri: vscode.Uri, prevResults?: RRType): Promise<{ content: string, map: any, replaceOperations: any, liquidImportsModule, subImportsRegistryModule, exportedObjectVariables, exportedVariables, liquidContent: string }>
{
  let liquidContent = documentContent;
  const file = path.parse(fileUri.fsPath);
  prevResults = {
    liquidImportsModule: [],
    subImportsRegistryModule: [],
    rawIncludeRegistry: [],
    formIncludes: [],
    ...(prevResults || {}),
  };
  let RR: RRType = {
    magicString: new MagicString(documentContent),
    replaceOperations: [],
    liquidContent: '',
    subImportsRegistryModule: Array.from(new Set([...prevResults.subImportsRegistryModule])),
    liquidImportsModule: Array.from(new Set([...prevResults.liquidImportsModule])),
    rawIncludeRegistry: Array.from(new Set([...prevResults.rawIncludeRegistry])),
    formIncludes: Array.from(new Set([...prevResults.formIncludes])),
  };

  const { code, map } = await preprocess(documentContent, {
    markup: async ({ content, filename }) =>
    {
      RR = await applyReplaces([
        themeImportProcessor,
        expressionProcessor,
        formProcessor,
        rawIncludeProcessor,
        ifStatementProcessor,
        liquivelteImportProcessor,
        removeLiquid,
      ], content, filename, RR);

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
      const existingContent = s.toString();
      let lineAfterScript = 2;
      existingContent.replace(/<script\s[^>]+>/, (a, offset) =>
      {
        lineAfterScript = getLineFromOffset(existingContent, offset);
        return '';
      });
      let prependedLines = lineAfterScript;
      prevResults.liquidImportsModule.forEach(themeImport =>
      { 
        if (
          existingContent.indexOf(`const ${themeImport}`) === -1 &&
          existingContent.indexOf(`let ${themeImport}`) === -1 &&
          existingContent.indexOf(`var ${themeImport}`) === -1
        ) {
          s.prepend(`
export let ${themeImport};`);
        }
        RR.replaceOperations.push({
          was: {
            lines: []
          },
          operation: {
            lines: [prependedLines, prependedLines + 1]
          },
          explanation: `Theme import will be provided as prop`
        });
        prependedLines += 1;
      });
      prevResults.subImportsRegistryModule.forEach(preImport =>
        {
        if (
          existingContent.indexOf(`const ${preImport.id};`) === -1 &&
          existingContent.indexOf(`let ${preImport.id};`) === -1 &&
          existingContent.indexOf(`var ${preImport.id};`) === -1
        ) { 
          s.prepend(`
export let ${preImport.id};`);
          RR.replaceOperations.push({
            was: {
              lines: []
            },
            operation: {
              lines: [prependedLines, prependedLines + 1]
            },
            explanation: `Theme sub import will be provided as prop`
          });
          prependedLines += 1;
        }
      });

      s.prepend(`${RR.rawIncludeRegistry.reduce((acc, rawInclude) =>
      {
        RR.replaceOperations.push({
          was: {
            lines: []
          },
          operation: {
            lines: [prependedLines, prependedLines + 1]
          },
          explanation: `Snippet html will be rendered as @html`
        });
        prependedLines += 1;
        return `${acc}
export let ${rawInclude.id};`;
      }, '')}`);
      s.prepend(`${RR.formIncludes.reduce((acc, formInclude) =>
      {
        RR.replaceOperations.push({
          was: {
            lines: []
          },
          operation: {
            lines: [prependedLines, prependedLines + 1, prependedLines + 2]
          },
          explanation: `Theme import will be provided as prop`
        });
        prependedLines += 2;
        return `${acc}
  export let form_inputs_${formInclude.id};
  export let form_props_${formInclude.id};`}, '')}`);
      s.prepend(`
  import cachedLiquid from 'liquivelte-liquid.js';
  export let lec;
  const liquid = cachedLiquid(lec);
  let index = 0;
`);
RR.replaceOperations.push({
  was: {
    lines: []
  },
  operation: {
    lines: [prependedLines, prependedLines + 1]
  },
  explanation: `Index should be always defined, we use index for includes in forloops`
});
      prependedLines += 1;

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
