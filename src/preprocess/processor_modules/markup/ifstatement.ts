import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';
import getLineFromOffset from '../../../utils/get-line-from-offset';
import createTagRegex from '../../../utils/create-tag-regex';

export default function ifStatementProcessor (markup: string, ms: MagicString, { liquidContent, replaceOperations } : { liquidContent: string, replaceOperations: any[] }): ReplaceResult
{

  markup.replace(/\{%-*\s*if\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    
    ms.overwrite(offset, offset + a.length, `{#if ${exp.replace(/\sand\s/g, ' && ')
      .replace(/\sor\s/g, ' || ')
      .replace(/\.size/gim, '.length')
      .replace(/blank/gim, undefined)
      .replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')} }`);
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted if statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*unless\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, `{#if !(${exp
      .replace(/\sand\s/g, ' && ')
      .replace(/\sor\s/g, ' || ')
      .replace(/\.size/gim, '.length')
      .replace(/blank/gim, undefined)
      .replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')} )}`);
    
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted unless statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*elsif\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, `{:else if ${exp
      .replace(/\sand\s/g, ' && ')
      .replace(/\sor\s/g, ' || ')
      .replace(/\.size/gim, '.length')
      .replace(/blank/gim, undefined)
      .replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')}}`);
  
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted elsif statement`
    });

    return '';  });
  markup.replace(/\{%-*\s*else\s*-*%\}/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, '{:else}');
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted else statement`
    });

    return '';
  });
  
  markup.replace(/\{%-*\s*(endif|endunless)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, '{/if}');

    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted endif statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*for\s*(.*?)\s*in(.*?)\s*(\(.*\))?\s*-*%\}/gim, (a, item, arr, index, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    item = item.replace(/([^\(]+)\s*(\(.+\))?/gim, (a, nm, par) => `${nm}, index ${par ? par : ''}`);
    
    ms.overwrite(offset, offset + a.length, `{#each ${arr} as ${item} ${index ? index : ''} }
{@const forloop = {
  first: index === 0,
  index: index + 1,
  index0: index,
  last: index === (${arr}).length - 1,
  rindex: (${arr}).length - index,
  rindex0: (${arr}).length - index - 1,
  length: (${arr}).length,
} }`);

    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted for loop`
    });

    return '';
  });

  liquidContent = liquidContent.replace(/\{%-*\s*for\s*(.*?)\s*in(.*?)\s*(\(.*\))?\s*-*%\}/gim, (a, item, arr, index, offset) =>
  { 
    return `${a.replace(index, '')}
    {% assign index = forloop.index0 %}`;
  });


  markup.replace(/\{%-*\s*endfor\s*-*%\}/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, '{/each}');
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted endfor statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*comment\s*-*%\}$/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, '<!--');

    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted comment`
    });

    return '';
  });

  markup.replace(/\{%-*\s*endcomment\s*-*%\}$/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, '-->');
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line]
      },
      explanation: `Converted end comment`
    });

    return '';
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    liquidContent
  };

  return result;
}