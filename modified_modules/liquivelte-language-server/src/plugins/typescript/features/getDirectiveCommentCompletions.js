"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectiveCommentCompletions = exports.tsDirectives = void 0;
const documents_1 = require("../../../lib/documents");
const vscode_languageserver_1 = require("vscode-languageserver");
/**
 * from https://github.com/microsoft/vscode/blob/157255fa4b0775c5ab8729565faf95927b610cac/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L19
 */
exports.tsDirectives = [
    {
        value: '@ts-check',
        description: 'Enables semantic checking in a JavaScript file. Must be at the top of a file.'
    },
    {
        value: '@ts-nocheck',
        description: 'Disables semantic checking in a JavaScript file. Must be at the top of a file.'
    },
    {
        value: '@ts-ignore',
        description: 'Suppresses @ts-check errors on the next line of a file.'
    },
    {
        value: '@ts-expect-error',
        description: 'Suppresses @ts-check errors on the next line of a file, expecting at least one to exist.'
    }
];
/**
 * from https://github.com/microsoft/vscode/blob/157255fa4b0775c5ab8729565faf95927b610cac/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L64
 */
function getDirectiveCommentCompletions(position, document, completionContext) {
    var _a, _b;
    // don't trigger until // @
    if ((completionContext === null || completionContext === void 0 ? void 0 : completionContext.triggerCharacter) === '/') {
        return null;
    }
    const inScript = documents_1.isInTag(position, document.scriptInfo);
    const inModule = documents_1.isInTag(position, document.moduleScriptInfo);
    if (!inModule && !inScript) {
        return null;
    }
    const lineStart = document.offsetAt(vscode_languageserver_1.Position.create(position.line, 0));
    const offset = document.offsetAt(position);
    const prefix = document.getText().slice(lineStart, offset);
    const match = prefix.match(/^\s*\/\/+\s?(@[a-zA-Z-]*)?$/);
    if (!match) {
        return null;
    }
    const startCharacter = Math.max(0, position.character - ((_b = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0));
    const start = vscode_languageserver_1.Position.create(position.line, startCharacter);
    const items = exports.tsDirectives.map(({ value, description }) => ({
        detail: description,
        label: value,
        kind: vscode_languageserver_1.CompletionItemKind.Snippet,
        textEdit: vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(start, vscode_languageserver_1.Position.create(start.line, start.character + value.length)), value)
    }));
    return vscode_languageserver_1.CompletionList.create(items, false);
}
exports.getDirectiveCommentCompletions = getDirectiveCommentCompletions;
//# sourceMappingURL=getDirectiveCommentCompletions.js.map