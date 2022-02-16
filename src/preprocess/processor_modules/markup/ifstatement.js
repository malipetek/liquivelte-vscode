"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_line_from_offset_1 = __importDefault(require("../../../utils/get-line-from-offset"));
function ifStatementProcessor(markup, ms, { liquidContent }) {
    const replaceOperations = [];
    markup.replace(/\{%-*\s*if\s*(.*?)\s*-*%\}/gim, (a, exp, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        ms.overwrite(offset, offset + a.length, `{#if ${exp.replace(/\sand\s/g, ' && ')
            .replace(/\sor\s/g, ' || ')
            .replace(/\.size\s/gim, '.length ')
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
    markup.replace(/\{%-*\s*unless\s*(.*?)\s*-*%\}/gim, (a, exp, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        ms.overwrite(offset, offset + a.length, `{#if !(${exp.replace(/\sand\s/g, ' && ').replace(/\sor\s/g, ' || ').replace(/\.size\s/gim, '.length ').replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')} )}`);
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
    markup.replace(/\{%-*\s*elsif\s*(.*?)\s*-*%\}/gim, (a, exp, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        ms.overwrite(offset, offset + a.length, `{:else if ${exp.replace(/\sand\s/g, ' && ').replace(/\sor\s/g, ' || ').replace(/\.size\s/gim, '.length ').replace(/([^\s]+)\scontains\s(['"][^\s]+['"])/gi, '($1.indexOf($2) > -1)')}}`);
        replaceOperations.push({
            was: {
                lines: [line]
            },
            operation: {
                lines: [line]
            },
            explanation: `Converted elsif statement`
        });
        return '';
    });
    markup.replace(/\{%-*\s*else\s*-*%\}$/gim, (a, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
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
    markup.replace(/\{%-*\s*(endif|endunless)\s*-*%\}/gim, (a, exp, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
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
    markup.replace(/\{%-*\s*for\s*(.*?)\s*in(.*?)\s*-*%\}/gim, (a, item, arr, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        item = item.replace(/([^\(]+)\s*(\(.+\))?/gim, (a, nm, par) => `${nm}, index ${par ? par : ''}`);
        ms.overwrite(offset, offset + a.length, `{#each ${arr} as ${item} }`);
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
    markup.replace(/\{%-*\s*endfor\s*-*%\}$/gim, (a, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
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
    markup.replace(/\{%-*\s*comment\s*-*%\}$/gim, (a, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
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
    markup.replace(/\{%-*\s*endcomment\s*-*%\}$/gim, (a, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
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
    const result = {
        magicString: ms,
        replaceOperations,
        liquidContent
    };
    return result;
}
exports.default = ifStatementProcessor;
//# sourceMappingURL=ifstatement.js.map