"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getLineFromOffset(str, offset) {
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
exports.default = getLineFromOffset;
//# sourceMappingURL=get-line-from-offset.js.map