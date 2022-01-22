"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTsExtensions = exports.changeSvelteComponentName = exports.getDiagnosticTag = exports.isInScript = exports.convertToTextSpan = exports.getTsCheckComment = exports.mapSeverity = exports.getCommitCharactersForScriptElement = exports.scriptElementKindToCompletionItemKind = exports.symbolKindFromString = exports.isSubPath = exports.findTsConfigPath = exports.hasNonZeroRange = exports.convertToLocationRange = exports.convertRange = exports.ensureRealSvelteFilePath = exports.toRealSvelteFilePath = exports.isVirtualSvelteFilePath = exports.isSvelteFilePath = exports.getScriptKindFromAttributes = exports.getExtensionFromScriptKind = exports.getScriptKindFromFileName = void 0;
const path_1 = require("path");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../lib/documents");
const utils_1 = require("../../utils");
function getScriptKindFromFileName(fileName) {
    const ext = fileName.substr(fileName.lastIndexOf('.'));
    switch (ext.toLowerCase()) {
        case typescript_1.default.Extension.Js:
            return typescript_1.default.ScriptKind.JS;
        case typescript_1.default.Extension.Jsx:
            return typescript_1.default.ScriptKind.JSX;
        case typescript_1.default.Extension.Ts:
            return typescript_1.default.ScriptKind.TS;
        case typescript_1.default.Extension.Tsx:
            return typescript_1.default.ScriptKind.TSX;
        case typescript_1.default.Extension.Json:
            return typescript_1.default.ScriptKind.JSON;
        default:
            return typescript_1.default.ScriptKind.Unknown;
    }
}
exports.getScriptKindFromFileName = getScriptKindFromFileName;
function getExtensionFromScriptKind(kind) {
    switch (kind) {
        case typescript_1.default.ScriptKind.JSX:
            return typescript_1.default.Extension.Jsx;
        case typescript_1.default.ScriptKind.TS:
            return typescript_1.default.Extension.Ts;
        case typescript_1.default.ScriptKind.TSX:
            return typescript_1.default.Extension.Tsx;
        case typescript_1.default.ScriptKind.JSON:
            return typescript_1.default.Extension.Json;
        case typescript_1.default.ScriptKind.JS:
        default:
            return typescript_1.default.Extension.Js;
    }
}
exports.getExtensionFromScriptKind = getExtensionFromScriptKind;
function getScriptKindFromAttributes(attrs) {
    const type = attrs.lang || attrs.type;
    switch (type) {
        case 'ts':
        case 'typescript':
        case 'text/ts':
        case 'text/typescript':
            return typescript_1.default.ScriptKind.TSX;
        case 'javascript':
        case 'text/javascript':
        default:
            return typescript_1.default.ScriptKind.JSX;
    }
}
exports.getScriptKindFromAttributes = getScriptKindFromAttributes;
function isSvelteFilePath(filePath) {
    return filePath.endsWith('.svelte');
}
exports.isSvelteFilePath = isSvelteFilePath;
function isVirtualSvelteFilePath(filePath) {
    return filePath.endsWith('.svelte.ts');
}
exports.isVirtualSvelteFilePath = isVirtualSvelteFilePath;
function toRealSvelteFilePath(filePath) {
    return filePath.slice(0, -'.ts'.length);
}
exports.toRealSvelteFilePath = toRealSvelteFilePath;
function ensureRealSvelteFilePath(filePath) {
    return isVirtualSvelteFilePath(filePath) ? toRealSvelteFilePath(filePath) : filePath;
}
exports.ensureRealSvelteFilePath = ensureRealSvelteFilePath;
function convertRange(document, range) {
    return vscode_languageserver_1.Range.create(document.positionAt(range.start || 0), document.positionAt((range.start || 0) + (range.length || 0)));
}
exports.convertRange = convertRange;
function convertToLocationRange(defDoc, textSpan) {
    const range = documents_1.mapRangeToOriginal(defDoc, convertRange(defDoc, textSpan));
    // Some definition like the svelte component class definition don't exist in the original, so we map to 0,1
    if (range.start.line < 0) {
        range.start.line = 0;
        range.start.character = 1;
    }
    if (range.end.line < 0) {
        range.end = range.start;
    }
    return range;
}
exports.convertToLocationRange = convertToLocationRange;
function hasNonZeroRange({ range }) {
    return (range &&
        (range.start.line !== range.end.line || range.start.character !== range.end.character));
}
exports.hasNonZeroRange = hasNonZeroRange;
function findTsConfigPath(fileName, rootUris) {
    const searchDir = path_1.dirname(fileName);
    const path = typescript_1.default.findConfigFile(searchDir, typescript_1.default.sys.fileExists, 'tsconfig.json') ||
        typescript_1.default.findConfigFile(searchDir, typescript_1.default.sys.fileExists, 'jsconfig.json') ||
        '';
    // Don't return config files that exceed the current workspace context.
    return !!path && rootUris.some((rootUri) => isSubPath(rootUri, path)) ? path : '';
}
exports.findTsConfigPath = findTsConfigPath;
function isSubPath(uri, possibleSubPath) {
    return utils_1.pathToUrl(possibleSubPath).startsWith(uri);
}
exports.isSubPath = isSubPath;
function symbolKindFromString(kind) {
    switch (kind) {
        case 'module':
            return vscode_languageserver_1.SymbolKind.Module;
        case 'class':
            return vscode_languageserver_1.SymbolKind.Class;
        case 'local class':
            return vscode_languageserver_1.SymbolKind.Class;
        case 'interface':
            return vscode_languageserver_1.SymbolKind.Interface;
        case 'enum':
            return vscode_languageserver_1.SymbolKind.Enum;
        case 'enum member':
            return vscode_languageserver_1.SymbolKind.Constant;
        case 'var':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'local var':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'function':
            return vscode_languageserver_1.SymbolKind.Function;
        case 'local function':
            return vscode_languageserver_1.SymbolKind.Function;
        case 'method':
            return vscode_languageserver_1.SymbolKind.Method;
        case 'getter':
            return vscode_languageserver_1.SymbolKind.Method;
        case 'setter':
            return vscode_languageserver_1.SymbolKind.Method;
        case 'property':
            return vscode_languageserver_1.SymbolKind.Property;
        case 'constructor':
            return vscode_languageserver_1.SymbolKind.Constructor;
        case 'parameter':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'type parameter':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'alias':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'let':
            return vscode_languageserver_1.SymbolKind.Variable;
        case 'const':
            return vscode_languageserver_1.SymbolKind.Constant;
        case 'JSX attribute':
            return vscode_languageserver_1.SymbolKind.Property;
        default:
            return vscode_languageserver_1.SymbolKind.Variable;
    }
}
exports.symbolKindFromString = symbolKindFromString;
function scriptElementKindToCompletionItemKind(kind) {
    switch (kind) {
        case typescript_1.default.ScriptElementKind.primitiveType:
        case typescript_1.default.ScriptElementKind.keyword:
            return vscode_languageserver_1.CompletionItemKind.Keyword;
        case typescript_1.default.ScriptElementKind.constElement:
            return vscode_languageserver_1.CompletionItemKind.Constant;
        case typescript_1.default.ScriptElementKind.letElement:
        case typescript_1.default.ScriptElementKind.variableElement:
        case typescript_1.default.ScriptElementKind.localVariableElement:
        case typescript_1.default.ScriptElementKind.alias:
            return vscode_languageserver_1.CompletionItemKind.Variable;
        case typescript_1.default.ScriptElementKind.memberVariableElement:
        case typescript_1.default.ScriptElementKind.memberGetAccessorElement:
        case typescript_1.default.ScriptElementKind.memberSetAccessorElement:
            return vscode_languageserver_1.CompletionItemKind.Field;
        case typescript_1.default.ScriptElementKind.functionElement:
            return vscode_languageserver_1.CompletionItemKind.Function;
        case typescript_1.default.ScriptElementKind.memberFunctionElement:
        case typescript_1.default.ScriptElementKind.constructSignatureElement:
        case typescript_1.default.ScriptElementKind.callSignatureElement:
        case typescript_1.default.ScriptElementKind.indexSignatureElement:
            return vscode_languageserver_1.CompletionItemKind.Method;
        case typescript_1.default.ScriptElementKind.enumElement:
            return vscode_languageserver_1.CompletionItemKind.Enum;
        case typescript_1.default.ScriptElementKind.moduleElement:
        case typescript_1.default.ScriptElementKind.externalModuleName:
            return vscode_languageserver_1.CompletionItemKind.Module;
        case typescript_1.default.ScriptElementKind.classElement:
        case typescript_1.default.ScriptElementKind.typeElement:
            return vscode_languageserver_1.CompletionItemKind.Class;
        case typescript_1.default.ScriptElementKind.interfaceElement:
            return vscode_languageserver_1.CompletionItemKind.Interface;
        case typescript_1.default.ScriptElementKind.warning:
        case typescript_1.default.ScriptElementKind.scriptElement:
            return vscode_languageserver_1.CompletionItemKind.File;
        case typescript_1.default.ScriptElementKind.directory:
            return vscode_languageserver_1.CompletionItemKind.Folder;
        case typescript_1.default.ScriptElementKind.string:
            return vscode_languageserver_1.CompletionItemKind.Constant;
    }
    return vscode_languageserver_1.CompletionItemKind.Property;
}
exports.scriptElementKindToCompletionItemKind = scriptElementKindToCompletionItemKind;
function getCommitCharactersForScriptElement(kind) {
    const commitCharacters = [];
    switch (kind) {
        case typescript_1.default.ScriptElementKind.memberGetAccessorElement:
        case typescript_1.default.ScriptElementKind.memberSetAccessorElement:
        case typescript_1.default.ScriptElementKind.constructSignatureElement:
        case typescript_1.default.ScriptElementKind.callSignatureElement:
        case typescript_1.default.ScriptElementKind.indexSignatureElement:
        case typescript_1.default.ScriptElementKind.enumElement:
        case typescript_1.default.ScriptElementKind.interfaceElement:
            commitCharacters.push('.');
            break;
        case typescript_1.default.ScriptElementKind.moduleElement:
        case typescript_1.default.ScriptElementKind.alias:
        case typescript_1.default.ScriptElementKind.constElement:
        case typescript_1.default.ScriptElementKind.letElement:
        case typescript_1.default.ScriptElementKind.variableElement:
        case typescript_1.default.ScriptElementKind.localVariableElement:
        case typescript_1.default.ScriptElementKind.memberVariableElement:
        case typescript_1.default.ScriptElementKind.classElement:
        case typescript_1.default.ScriptElementKind.functionElement:
        case typescript_1.default.ScriptElementKind.memberFunctionElement:
            commitCharacters.push('.', ',');
            commitCharacters.push('(');
            break;
    }
    return commitCharacters.length === 0 ? undefined : commitCharacters;
}
exports.getCommitCharactersForScriptElement = getCommitCharactersForScriptElement;
function mapSeverity(category) {
    switch (category) {
        case typescript_1.default.DiagnosticCategory.Error:
            return vscode_languageserver_1.DiagnosticSeverity.Error;
        case typescript_1.default.DiagnosticCategory.Warning:
            return vscode_languageserver_1.DiagnosticSeverity.Warning;
        case typescript_1.default.DiagnosticCategory.Suggestion:
            return vscode_languageserver_1.DiagnosticSeverity.Hint;
        case typescript_1.default.DiagnosticCategory.Message:
            return vscode_languageserver_1.DiagnosticSeverity.Information;
    }
    return vscode_languageserver_1.DiagnosticSeverity.Error;
}
exports.mapSeverity = mapSeverity;
// Matches comments that come before any non-comment content
const commentsRegex = /^(\s*\/\/.*\s*)*/;
// The following regex matches @ts-check or @ts-nocheck if:
// - must be @ts-(no)check
// - the comment which has @ts-(no)check can have any type of whitespace before it, but not other characters
// - what's coming after @ts-(no)check is irrelevant as long there is any kind of whitespace or line break, so this would be picked up, too: // @ts-check asdasd
// [ \t\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
// is just \s (a.k.a any whitespace character) without linebreak and vertical tab
// eslint-disable-next-line max-len
const tsCheckRegex = /\/\/[ \t\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*(@ts-(no)?check)($|\s)/;
/**
 * Returns `// @ts-check` or `// @ts-nocheck` if content starts with comments and has one of these
 * in its comments.
 */
function getTsCheckComment(str = '') {
    var _a;
    const comments = (_a = str.match(commentsRegex)) === null || _a === void 0 ? void 0 : _a[0];
    if (comments) {
        const tsCheck = comments.match(tsCheckRegex);
        if (tsCheck) {
            // second-last entry is the capturing group with the exact ts-check wording
            return `// ${tsCheck[tsCheck.length - 3]}${typescript_1.default.sys.newLine}`;
        }
    }
}
exports.getTsCheckComment = getTsCheckComment;
function convertToTextSpan(range, fragment) {
    const start = fragment.offsetAt(fragment.getGeneratedPosition(range.start));
    const end = fragment.offsetAt(fragment.getGeneratedPosition(range.end));
    return {
        start,
        length: end - start
    };
}
exports.convertToTextSpan = convertToTextSpan;
function isInScript(position, fragment) {
    return documents_1.isInTag(position, fragment.scriptInfo) || documents_1.isInTag(position, fragment.moduleScriptInfo);
}
exports.isInScript = isInScript;
function getDiagnosticTag(diagnostic) {
    const tags = [];
    if (diagnostic.reportsUnnecessary) {
        tags.push(vscode_languageserver_1.DiagnosticTag.Unnecessary);
    }
    if (diagnostic.reportsDeprecated) {
        tags.push(vscode_languageserver_1.DiagnosticTag.Deprecated);
    }
    return tags;
}
exports.getDiagnosticTag = getDiagnosticTag;
function changeSvelteComponentName(name) {
    return name.replace(/(\w+)__SvelteComponent_/, '$1');
}
exports.changeSvelteComponentName = changeSvelteComponentName;
function hasTsExtensions(fileName) {
    return (fileName.endsWith(typescript_1.default.Extension.Dts) ||
        fileName.endsWith(typescript_1.default.Extension.Tsx) ||
        fileName.endsWith(typescript_1.default.Extension.Ts));
}
exports.hasTsExtensions = hasTsExtensions;
//# sourceMappingURL=utils.js.map