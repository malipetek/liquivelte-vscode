"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_line_from_offset_1 = __importDefault(require("../../../utils/get-line-from-offset"));
function expressionProcessor(markup, ms) {
    const replaceOperations = [];
    markup.replace(/"?\{\{-\s*(.*?)\s*(\|.*?)?-\}\}"?/gim, (a, expression, filter, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        if (filter) {
            if (/html/gi.test(filter)) {
                ms.overwrite(offset, offset + a.length, `{@html ${expression} || ''}`);
                replaceOperations.push({
                    was: {
                        lines: [line]
                    },
                    operation: {
                        lines: [line]
                    },
                    explanation: `converted html filter`
                });
                return '';
            }
            /*
            * Convert expressions after pipe operator
            * example: {{- "{{name}}" | html -}}
            */
            const exp = filter.match(/(\|\s*[^\|]+)(\:\s*[^\|]+)?/gi).map(filt => {
                const filterReplaced = filt.replace(/\|\s*(\w+)\:?\s*([^\|]+)?/gi, '$1 $2');
                const filter_value = filterReplaced.match(/([\w]|(".*?")|('.*?'))+/gi);
                return { filter: filter_value[0], value: filter_value[1] || filter_value[2], second_value: filter_value[2] };
            }).reduce((c, e, i) => {
                return `liquid.${e.filter}(${i == 0 ? expression : c}${e.value ? `, ${e.value}${e.second_value !== undefined ? `, ${e.second_value}` : ''}` : ''})`;
            }, '');
            ms.overwrite(offset, offset + a.length, `{ ${exp} }`);
            replaceOperations.push({
                was: {
                    lines: [line]
                },
                operation: {
                    lines: [line]
                },
                explanation: `Converted statement with filters, remember to include liquid.js`
            });
            return '';
        }
        else {
            ms.overwrite(offset, offset + a.length, `{ ${expression} || ''}`);
            replaceOperations.push({
                was: {
                    lines: [line]
                },
                operation: {
                    lines: [line]
                },
                explanation: `Converted statement`
            });
            return '';
        }
    });
    const result = {
        magicString: ms,
        replaceOperations
    };
    return result;
}
exports.default = expressionProcessor;
//# sourceMappingURL=expression.js.map