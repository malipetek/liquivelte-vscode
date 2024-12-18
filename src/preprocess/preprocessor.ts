import * as vscode from 'vscode';
import { preprocess } from 'svelte/compiler';
import MagicString from 'magic-string';
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

function applyReplaces(replacers, content, filename, RR) {
  const replaceOperations = [];
  let liquidImportsModule = [...RR.liquidImportsModule];
  let subImportsRegistryModule = [...RR.subImportsRegistryModule];
  let rawIncludeRegistry = [...RR.rawIncludeRegistry];
  let formIncludes = [...RR.formIncludes];
  let liquidContent = content;

  const options = {
    filename,
    indentExclusionRanges: [],
  };

  let magicString = new MagicString(content, options);

  for (let replacer of replacers) {
    const replaceResult = replacer(content, magicString, {
      liquidContent,
      liquidImportsModule,
      subImportsRegistryModule,
      rawIncludeRegistry,
      replaceOperations,
      formIncludes,
      filename,
    });
    liquidContent = replaceResult.liquidContent || liquidContent;
  }

  return {
    magicString,
    replaceOperations,
    liquidContent,
    subImportsRegistryModule,
    liquidImportsModule,
    rawIncludeRegistry,
    formIncludes,
  };
}

export function transformSync(content) {
  let RR = {
    magicString: new MagicString(content),
    replaceOperations: [],
    liquidImportsModule: [],
    subImportsRegistryModule: [],
    rawIncludeRegistry: [],
    liquidContent: content,
    formIncludes: [],
  };

  RR = applyReplaces(
    [
      themeImportProcessor,
      expressionProcessor,
      formProcessor,
      rawIncludeProcessor,
      ifStatementProcessor,
      liquivelteImportProcessor,
      removeLiquid,
    ],
    content,
    'noname',
    RR
  );

  RR.magicString.append(
    `${RR.rawIncludeRegistry.reduce(
      (acc, rawInclude) => `${acc}\nlet ${rawInclude.id} = themeImports['${rawInclude.id}'];`,
      ''
    )}`
  );

  return {
    code: RR.magicString.toString(),
    map: RR.magicString.generateMap(),
    ...RR,
  };
}

export default async function liquivelteTransformer(documentContent, fileUri, prevResults) {
  let liquidContent = documentContent;
  const file = path.parse(fileUri.fsPath);
  prevResults = {
    liquidImportsModule: [],
    subImportsRegistryModule: [],
    rawIncludeRegistry: [],
    formIncludes: [],
    ...(prevResults || {}),
  };
  let RR = {
    magicString: new MagicString(documentContent),
    replaceOperations: [],
    liquidContent: '',
    subImportsRegistryModule: Array.from(new Set([...prevResults.subImportsRegistryModule])),
    liquidImportsModule: Array.from(new Set([...prevResults.liquidImportsModule])),
    rawIncludeRegistry: Array.from(new Set([...prevResults.rawIncludeRegistry])),
    formIncludes: Array.from(new Set([...prevResults.formIncludes])),
  };

  const { code, map } = await preprocess(documentContent, {
    markup: async ({ content, filename }) => {
      RR = await applyReplaces(
        [
          themeImportProcessor,
          expressionProcessor,
          formProcessor,
          rawIncludeProcessor,
          ifStatementProcessor,
          liquivelteImportProcessor,
          removeLiquid,
        ],
        content,
        filename,
        RR
      );

      return {
        code: RR.magicString.toString(),
        map: RR.magicString.generateMap(),
      };
    },
    script: ({ content, attributes, markup, filename }) => {
      if (filename === undefined || attributes.context == 'module') {
        return {
          code: content,
          map: undefined,
        };
      }

      const options = {
        filename,
        indentExclusionRanges: [],
      };

      const s = new MagicString(content, options);
      const existingContent = s.toString();
      let lineAfterScript = 2;
      existingContent.replace(/<script\s[^>]+>/, (a, offset) => {
        lineAfterScript = getLineFromOffset(existingContent, offset);
        return '';
      });
      let prependedLines = lineAfterScript;
      prevResults.liquidImportsModule.forEach((themeImport) => {
        if (
          existingContent.indexOf(`const ${themeImport}`) === -1 &&
          existingContent.indexOf(`let ${themeImport}`) === -1 &&
          existingContent.indexOf(`var ${themeImport}`) === -1
        ) {
          s.prepend(`\nlet  ${themeImport} = themeImports['${themeImport}'];`);
        }
        RR.replaceOperations.push({
          was: {
            lines: [],
          },
          operation: {
            lines: [prependedLines, prependedLines + 1],
          },
          explanation: `Theme import will be provided as prop`,
        });
        prependedLines += 1;
      });
      prevResults.subImportsRegistryModule.forEach((preImport) => {
        if (
          existingContent.indexOf(`const ${preImport.id};`) === -1 &&
          existingContent.indexOf(`let ${preImport.id};`) === -1 &&
          existingContent.indexOf(`var ${preImport.id};`) === -1
        ) {
          s.prepend(`\n  let ${preImport.id};`);
          RR.replaceOperations.push({
            was: {
              lines: [],
            },
            operation: {
              lines: [prependedLines, prependedLines + 1],
            },
            explanation: `Theme sub import will be provided as prop`,
          });
          prependedLines += 1;
        }
      });

      s.prepend(
        `${RR.rawIncludeRegistry.reduce((acc, rawInclude) => {
          RR.replaceOperations.push({
            was: {
              lines: [],
            },
            operation: {
              lines: [prependedLines, prependedLines + 1],
            },
            explanation: `Snippet html will be rendered as @html`,
          });
          prependedLines += 1;
          return `${acc}\nlet ${rawInclude.id} = themeImports['${rawInclude.id}'];`;
        }, '')}`
      );
      s.prepend(
        `${RR.formIncludes.reduce((acc, formInclude) => {
          RR.replaceOperations.push({
            was: {
              lines: [],
            },
            operation: {
              lines: [prependedLines, prependedLines + 1, prependedLines + 2],
            },
            explanation: `Theme import will be provided as prop`,
          });
          prependedLines += 2;
          return `${acc}\n  let form_inputs_${formInclude.id} = themeImports['form_inputs_${formInclude.id}'];\n  let form_props_${formInclude.id} = themeImports['form_props_${formInclude.id}'];`;
        }, '')}`
      );

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
          lines: [],
        },
        operation: {
          lines: [prependedLines, prependedLines + 1],
        },
        explanation: `Index should be always defined, we use index for includes in forloops`,
      });
      prependedLines += 1;

      return {
        code: s.toString(),
        map: s.generateMap(),
      };
    },
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

  RR.liquidContent = stripTags(RR.liquidContent);

  return {
    content: code,
    map,
    exportedVariables: [],
    exportedObjectVariables: [],
    ...RR,
  };
}
