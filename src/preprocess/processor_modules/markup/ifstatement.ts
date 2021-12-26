import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';
import type { SubImportsRegistryModuleEntry, ReplaceResult, SubImportRegistryModule } from '../types';

let linesAdded: number = 0;
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

function getLineFromOffset(str: string,offset: number) : number {
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
export default function ifStatementProcessor (markup: string, ms: MagicString, previousReplace?: ReplaceResult): ReplaceResult
{
  linesAdded = previousReplace?.linesAdded || 0;
  markup.replace(/\{%-*\s*if\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    
    ms.overwrite(offset, offset + a.length, `{#if ${exp.replace(/\sand\s/g, ' && ')
      .replace(/\sor\s/g, ' || ')
      .replace(/\.size\s/gim, '.length ')
      .replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')} }`);
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
      },
      explanation: `Converted if statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*unless\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, `{#if !(${exp.replace(/\sand\s/g, ' && ').replace(/\sor\s/g, ' || ').replace(/\.size\s/gim, '.length ').replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')} )}`);
    
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
      },
      explanation: `Converted unless statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*elsif\s*(.*?)\s*-*%\}/gim, (a, exp, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, `{:else if ${exp.replace(/\sand\s/g, ' && ').replace(/\sor\s/g, ' || ').replace(/\.size\s/gim, '.length ').replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')}}`);
  
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
      },
      explanation: `Converted elsif statement`
    });

    return '';  });
  markup.replace(/\{%-*\s*else\s*-*%\}$/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);

    ms.overwrite(offset, offset + a.length, '{:else}');
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
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
        lines: [line + linesAdded]
      },
      explanation: `Converted endif statement`
    });

    return '';
  });

  markup.replace(/\{%-*\s*for\s*(.*?)\s*in(.*?)\s*-*%\}/gim, (a, item, arr, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    item = item.replace(/([^\(]+)\s*(\(.+\))?/gim, (a, nm, par) => `${nm}, index ${par ? par : ''}`);
    
    ms.overwrite(offset, offset + a.length, `{#each ${arr} as ${item} }`);

    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
      },
      explanation: `Converted for loop`
    });

    return '';
  });

  markup.replace(/\{%-*\s*endfor\s*-*%\}$/gim, (a, offset) =>
  {
    const line = getLineFromOffset(markup, offset);
    ms.overwrite(offset, offset + a.length, '{/each}');
    replaceOperations.push({
      was: {
        lines: [line]
      },
      operation: {
        lines: [line + linesAdded]
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
        lines: [line + linesAdded]
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
        lines: [line + linesAdded]
      },
      explanation: `Converted end comment`
    });

    return '';
  });

  const result: ReplaceResult = {
    magicString: ms,
    replaceOperations,
    linesAdded
  };

  return result;
}