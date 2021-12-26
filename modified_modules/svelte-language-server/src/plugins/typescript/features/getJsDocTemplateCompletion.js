"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJsDocTemplateCompletion = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const DEFAULT_SNIPPET = `/**${typescript_1.default.sys.newLine} * $0${typescript_1.default.sys.newLine} */`;
function getJsDocTemplateCompletion(fragment, lang, filePath, offset) {
    var _a, _b;
    const template = lang.getDocCommentTemplateAtPosition(filePath, offset);
    if (!template) {
        return null;
    }
    const { text } = fragment;
    const lineStart = text.lastIndexOf('\n', offset);
    const lineEnd = text.indexOf('\n', offset);
    const isLastLine = lineEnd === -1;
    const line = text.substring(lineStart, isLastLine ? undefined : lineEnd);
    const character = offset - lineStart;
    const start = line.lastIndexOf('/**', character) + lineStart;
    const suffix = line.slice(character).match(/^\s*\**\//);
    const textEditRange = documents_1.mapRangeToOriginal(fragment, vscode_languageserver_1.Range.create(fragment.positionAt(start), fragment.positionAt(offset + ((_b = (_a = suffix === null || suffix === void 0 ? void 0 : suffix[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0))));
    const { newText } = template;
    const snippet = 
    // When typescript returns an empty single line template
    // return the default multi-lines snippet,
    // making it consistent with VSCode typescript
    newText === '/** */' ? DEFAULT_SNIPPET : templateToSnippet(newText);
    const item = {
        label: '/** */',
        detail: 'JSDoc comment',
        sortText: '\0',
        kind: vscode_languageserver_1.CompletionItemKind.Snippet,
        textEdit: vscode_languageserver_1.TextEdit.replace(textEditRange, snippet),
        insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet
    };
    return vscode_languageserver_1.CompletionList.create([item]);
}
exports.getJsDocTemplateCompletion = getJsDocTemplateCompletion;
/**
 * adopted from https://github.com/microsoft/vscode/blob/a4b011697892ab656e1071b42c8af4b192078f28/extensions/typescript-language-features/src/languageFeatures/jsDocCompletions.ts#L94
 * Currently typescript won't return `@param` type template for files
 * that has extension other than `.js` and `.jsx`
 * So we don't need to insert snippet-tab-stop for it
 */
function templateToSnippet(text) {
    return (text
        // $ is for snippet tab stop
        .replace(/\$/g, '\\$')
        .split('\n')
        // remove indent but not line break and let client handle it
        .map((part) => part.replace(/^\s*(?=(\/|[ ]\*))/g, ''))
        .join('\n')
        .replace(/^(\/\*\*\s*\*[ ]*)$/m, (x) => x + '$0'));
}
//# sourceMappingURL=getJsDocTemplateCompletion.js.map