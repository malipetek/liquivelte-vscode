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
    const replaceResult = replacer(content, magicString, { liquidContent, liquidImportsModule , subImportsRegistryModule, rawIncludeRegistry, replaceOperations, formIncludes, filename });
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
  let ${rawInclude.id} = themeImports['${rawInclude.id}']`, '')}`);

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
      if (filename === undefined || attributes.context == 'module') {
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
let  ${themeImport} = themeImports['${themeImport}'];`);
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
  let ${preImport.id};`);
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
let ${rawInclude.id} = themeImports['${rawInclude.id}'];`;
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
  let form_inputs_${formInclude.id} = themeImports['form_inputs_${formInclude.id}'];
  let form_props_${formInclude.id} = themeImports['form_props_${formInclude.id}'];`}, '')}`);

      /* 
      function findClosest(arr, cic, direction) {
        // Check if the "cic" value is in the array
        const match = arr.find(val => val === cic);
        if (match) {
          return match;
        } else {
          // Find the closest number to "cic"
          let closest = arr.reduce((prev, curr) => {
              return (Math.abs(curr - cic) < Math.abs(prev - cic) ? curr : prev);
          });
          if (arr.filter(val => val === closest).length > 1 && direction) {
            return direction === 'higher' ? Math.max(...arr.filter(val => val > cic && val === closest)) : Math.min(...arr.filter(val => val < cic && val === closest));
          }
          return closest;
        }
      }
      */
      s.prepend(`
  export let importsSeek = 'lower';
  function fc(e,t,r){const n=e.find((e=>e===t));return n||e.reduce(((e,n)=>{let o=Math.abs(e-t),i=Math.abs(n-t);return"higher"===r?n>t&&i<=o?n:e:"lower"===r?n<t&&i<=o?n:e:void 0}))}
  import { getContext, setContext } from 'svelte';
  let themeImports = getContext('svelteProps') || {};
  let lec = getContext('lec') || {};
  (() => window.cicR = $$props.resetCicR ? 1 : window.cicR + 1 )();
	const cic = window.cicR;

  import cachedLiquid from 'liquivelte-liquid.js';
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
  documentContent.replace(/export\slet\s([^\=\;]+)\s*(=\s*(\{[^\}]+\}))?/gi, (a, v, o) => {

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
