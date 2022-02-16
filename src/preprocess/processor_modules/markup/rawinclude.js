"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uid_1 = require("uid");
const replaceOperations = [];
const get_line_from_offset_1 = __importDefault(require("../../../utils/get-line-from-offset"));
function rawIncludeProcessor(markup, ms, { rawIncludeRegistry }) {
    markup.replace(/\{%-*\s*(include)\s*['"](.*?)['"]\s*(.*?)\s*-*%\}/gim, (a, keyword, include, rest, offset) => {
        const line = get_line_from_offset_1.default(markup, offset);
        var id = `rawinclude_${uid_1.uid()}`;
        rawIncludeRegistry.push({
            id
        });
        ms.overwrite(offset, offset + a.length, `{@html ${id}[(global.index || 0)]}`);
        replaceOperations.push({
            was: {
                lines: [line]
            },
            operation: {
                lines: [line]
            },
            explanation: `Snippet includes are treated like captured values`
        });
        return '';
    });
    const result = {
        magicString: ms,
        replaceOperations,
        rawIncludeRegistry,
    };
    return result;
}
exports.default = rawIncludeProcessor;
//# sourceMappingURL=rawinclude.js.map