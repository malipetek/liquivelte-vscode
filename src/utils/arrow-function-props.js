"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putBackArrowFunctions = exports.stripArrowFunctions = void 0;
function stripArrowFunctions(str) {
    let tagOpen = false;
    let bracketOpen = false;
    let newStr = '';
    let strArr = str.split('');
    let preventAdd = false;
    for (let i = 0; i < strArr.length; i++) {
        const char = strArr[i];
        switch (char) {
            case '<':
                tagOpen = true;
                break;
            case '=':
                if (tagOpen && strArr[i + 1] === '>') {
                    newStr += '_afeq_';
                    preventAdd = true;
                }
                break;
            case '>':
                if (tagOpen && strArr[i - 1] !== '=') {
                    tagOpen = false;
                }
                if (tagOpen && strArr[i - 1] === '=') {
                    preventAdd = true;
                    newStr += '_afct_';
                }
                break;
            case '{':
                bracketOpen = true;
                break;
            case '}':
                bracketOpen = false;
                break;
        }
        if (!preventAdd) {
            newStr += char;
        }
        preventAdd = false;
    }
    return newStr;
}
exports.stripArrowFunctions = stripArrowFunctions;
function putBackArrowFunctions(str) {
    return str.replace(/_afct_/g, '>').replace(/_afeq_/g, '=');
}
exports.putBackArrowFunctions = putBackArrowFunctions;
//# sourceMappingURL=arrow-function-props.js.map