"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRefactoringCommand = exports.extractComponentCommand = void 0;
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../lib/documents");
const utils_1 = require("../../../../utils");
exports.extractComponentCommand = 'extract_to_svelte_component';
function executeRefactoringCommand(svelteDoc, command, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (command === exports.extractComponentCommand && args) {
            return executeExtractComponentCommand(svelteDoc, args[1]);
        }
        return null;
    });
}
exports.executeRefactoringCommand = executeRefactoringCommand;
function executeExtractComponentCommand(svelteDoc, refactorArgs) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const { range } = refactorArgs;
        if (isInvalidSelectionRange()) {
            return 'Invalid selection range';
        }
        let filePath = refactorArgs.filePath || './NewComponent.svelte';
        if (!filePath.endsWith('.svelte')) {
            filePath += '.svelte';
        }
        if (!filePath.startsWith('.')) {
            filePath = './' + filePath;
        }
        const componentName = ((_a = filePath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('.svelte')[0]) || '';
        const newFileUri = utils_1.pathToUrl(path.join(path.dirname(svelteDoc.getFilePath()), filePath));
        return {
            documentChanges: [
                vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(svelteDoc.uri, null), [
                    vscode_languageserver_1.TextEdit.replace(range, `<${componentName}></${componentName}>`),
                    createComponentImportTextEdit()
                ]),
                vscode_languageserver_1.CreateFile.create(newFileUri, { overwrite: true }),
                createNewFileEdit()
            ]
        };
        function isInvalidSelectionRange() {
            const text = svelteDoc.getText();
            const offsetStart = svelteDoc.offsetAt(range.start);
            const offsetEnd = svelteDoc.offsetAt(range.end);
            const validStart = offsetStart === 0 || /[\s\W]/.test(text[offsetStart - 1]);
            const validEnd = offsetEnd === text.length - 1 || /[\s\W]/.test(text[offsetEnd]);
            return (!validStart ||
                !validEnd ||
                documents_1.isRangeInTag(range, svelteDoc.style) ||
                documents_1.isRangeInTag(range, svelteDoc.script) ||
                documents_1.isRangeInTag(range, svelteDoc.moduleScript));
        }
        function createNewFileEdit() {
            const text = svelteDoc.getText();
            const newText = [
                getTemplate(),
                getTag(svelteDoc.script, false),
                getTag(svelteDoc.moduleScript, false),
                getTag(svelteDoc.style, true)
            ]
                .filter((tag) => tag.start >= 0)
                .sort((a, b) => a.start - b.start)
                .map((tag) => tag.text)
                .join('');
            return vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(newFileUri, null), [vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(0, 0), newText)]);
            function getTemplate() {
                const startOffset = svelteDoc.offsetAt(range.start);
                return {
                    text: text.substring(startOffset, svelteDoc.offsetAt(range.end)) + '\n\n',
                    start: startOffset
                };
            }
            function getTag(tag, isStyleTag) {
                if (!tag) {
                    return { text: '', start: -1 };
                }
                const tagText = updateRelativeImports(svelteDoc, text.substring(tag.container.start, tag.container.end), filePath, isStyleTag);
                return {
                    text: `${tagText}\n\n`,
                    start: tag.container.start
                };
            }
        }
        function createComponentImportTextEdit() {
            var _a;
            const startPos = (_a = (svelteDoc.script || svelteDoc.moduleScript)) === null || _a === void 0 ? void 0 : _a.startPos;
            const importText = `\n  import ${componentName} from '${filePath}';\n`;
            return vscode_languageserver_1.TextEdit.insert(startPos || vscode_languageserver_1.Position.create(0, 0), startPos ? importText : `<script>\n${importText}</script>`);
        }
    });
}
// `import {...} from '..'` or `import ... from '..'`
const scriptRelativeImportRegex = 
// eslint-disable-next-line max-len
/import\s+{[^}]*}.*['"`](((\.\/)|(\.\.\/)).*?)['"`]|import\s+\w+\s+from\s+['"`](((\.\/)|(\.\.\/)).*?)['"`]/g;
// `@import '..'`
const styleRelativeImportRege = /@import\s+['"`](((\.\/)|(\.\.\/)).*?)['"`]/g;
function updateRelativeImports(svelteDoc, tagText, newComponentRelativePath, isStyleTag) {
    const oldPath = path.dirname(svelteDoc.getFilePath());
    const newPath = path.dirname(path.join(oldPath, newComponentRelativePath));
    const regex = isStyleTag ? styleRelativeImportRege : scriptRelativeImportRegex;
    let match = regex.exec(tagText);
    while (match) {
        // match[1]: match before | and style regex. match[5]: match after | (script regex)
        const importPath = match[1] || match[5];
        const newImportPath = documents_1.updateRelativeImport(oldPath, newPath, importPath);
        tagText = tagText.replace(importPath, newImportPath);
        match = regex.exec(tagText);
    }
    return tagText;
}
//# sourceMappingURL=getRefactorings.js.map