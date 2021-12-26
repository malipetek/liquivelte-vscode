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
exports.CodeActionsProviderImpl = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const importPackage_1 = require("../../../importPackage");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../../../utils");
const DocumentSnapshot_1 = require("../DocumentSnapshot");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
class CodeActionsProviderImpl {
    constructor(lsAndTsDocResolver, completionProvider, configManager) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
        this.completionProvider = completionProvider;
        this.configManager = configManager;
    }
    getCodeActions(document, range, context, cancellationToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = context.only) === null || _a === void 0 ? void 0 : _a[0]) === vscode_languageserver_1.CodeActionKind.SourceOrganizeImports) {
                return yield this.organizeImports(document, cancellationToken);
            }
            if (context.diagnostics.length &&
                (!context.only || context.only.includes(vscode_languageserver_1.CodeActionKind.QuickFix))) {
                return yield this.applyQuickfix(document, range, context, cancellationToken);
            }
            if (!context.only || context.only.includes(vscode_languageserver_1.CodeActionKind.Refactor)) {
                return yield this.getApplicableRefactors(document, range, cancellationToken);
            }
            return [];
        });
    }
    organizeImports(document, cancellationToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!document.scriptInfo && !document.moduleScriptInfo) {
                return [];
            }
            const { lang, tsDoc, userPreferences } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return [];
            }
            const useSemicolons = (_a = this.configManager.getMergedPrettierConfig(yield importPackage_1.importPrettier(document.getFilePath()).resolveConfig(document.getFilePath(), {
                editorconfig: true
            })).semi) !== null && _a !== void 0 ? _a : true;
            const changes = lang.organizeImports({
                fileName: tsDoc.filePath,
                type: 'file'
            }, {
                semicolons: useSemicolons
                    ? typescript_1.default.SemicolonPreference.Insert
                    : typescript_1.default.SemicolonPreference.Remove
            }, userPreferences);
            const documentChanges = yield Promise.all(changes.map((change) => __awaiter(this, void 0, void 0, function* () {
                // Organize Imports will only affect the current file, so no need to check the file path
                return vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(document.url, null), change.textChanges.map((edit) => {
                    const range = this.checkRemoveImportCodeActionRange(edit, fragment, documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, edit.span)));
                    return vscode_languageserver_1.TextEdit.replace(range, this.fixIndentationOfImports(edit.newText, range, document));
                }));
            })));
            return [
                vscode_languageserver_1.CodeAction.create('Organize Imports', { documentChanges }, vscode_languageserver_1.CodeActionKind.SourceOrganizeImports)
            ];
        });
    }
    fixIndentationOfImports(edit, range, document) {
        // "Organize Imports" will have edits that delete all imports by return empty edits
        // and one edit which contains all the organized imports. Fix indentation
        // of that one by prepending all lines with the indentation of the first line.
        if (!edit || range.start.character === 0) {
            return edit;
        }
        const line = documents_1.getLineAtPosition(range.start, document.getText());
        const leadingChars = line.substring(0, range.start.character);
        if (leadingChars.trim() !== '') {
            return edit;
        }
        return utils_1.modifyLines(edit, (line, idx) => (idx === 0 || !line ? line : leadingChars + line));
    }
    checkRemoveImportCodeActionRange(edit, fragment, range) {
        // Handle svelte2tsx wrong import mapping:
        // The character after the last import maps to the start of the script
        // TODO find a way to fix this in svelte2tsx and then remove this
        if ((range.end.line === 0 && range.end.character === 1) ||
            range.end.line < range.start.line) {
            edit.span.length -= 1;
            range = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, edit.span));
            range.end.character += 1;
            if (fragment instanceof DocumentSnapshot_1.SvelteSnapshotFragment &&
                documents_1.isAtEndOfLine(documents_1.getLineAtPosition(range.end, fragment.originalText), range.end.character)) {
                range.end.line += 1;
                range.end.character = 0;
            }
        }
        return range;
    }
    applyQuickfix(document, range, context, cancellationToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc, userPreferences } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return [];
            }
            const start = fragment.offsetAt(fragment.getGeneratedPosition(range.start));
            const end = fragment.offsetAt(fragment.getGeneratedPosition(range.end));
            const errorCodes = context.diagnostics.map((diag) => Number(diag.code));
            const codeFixes = lang.getCodeFixesAtPosition(tsDoc.filePath, start, end, errorCodes, {}, userPreferences);
            const componentQuickFix = errorCodes.includes(2304) // "Cannot find name '...'."
                ? (_a = this.getComponentImportQuickFix(start, end, lang, tsDoc.filePath, userPreferences)) !== null && _a !== void 0 ? _a : []
                : [];
            const docs = new utils_3.SnapshotFragmentMap(this.lsAndTsDocResolver);
            docs.set(tsDoc.filePath, { fragment, snapshot: tsDoc });
            const codeActionsPromises = codeFixes.concat(componentQuickFix).map((fix) => __awaiter(this, void 0, void 0, function* () {
                const documentChangesPromises = fix.changes.map((change) => __awaiter(this, void 0, void 0, function* () {
                    const { snapshot, fragment } = yield docs.retrieve(change.fileName);
                    return vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(utils_1.pathToUrl(change.fileName), null), change.textChanges
                        .map((edit) => {
                        if (fix.fixName === 'import' &&
                            fragment instanceof DocumentSnapshot_1.SvelteSnapshotFragment) {
                            return this.completionProvider.codeActionChangeToTextEdit(document, fragment, edit, true, range.start);
                        }
                        if (!utils_3.isNoTextSpanInGeneratedCode(snapshot.getFullText(), edit.span)) {
                            return undefined;
                        }
                        let originalRange = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, edit.span));
                        if (fix.fixName === 'unusedIdentifier') {
                            originalRange = this.checkRemoveImportCodeActionRange(edit, fragment, originalRange);
                        }
                        if (fix.fixName === 'fixMissingFunctionDeclaration') {
                            originalRange = this.checkEndOfFileCodeInsert(originalRange, range, document);
                        }
                        if (fix.fixName === 'disableJsDiagnostics') {
                            if (edit.newText.includes('ts-nocheck')) {
                                return this.checkTsNoCheckCodeInsert(document, edit);
                            }
                            return this.checkDisableJsDiagnosticsCodeInsert(originalRange, document, edit);
                        }
                        if (originalRange.start.line < 0 || originalRange.end.line < 0) {
                            return undefined;
                        }
                        return vscode_languageserver_1.TextEdit.replace(originalRange, edit.newText);
                    })
                        .filter(utils_1.isNotNullOrUndefined));
                }));
                const documentChanges = yield Promise.all(documentChangesPromises);
                return vscode_languageserver_1.CodeAction.create(fix.description, {
                    documentChanges
                }, vscode_languageserver_1.CodeActionKind.QuickFix);
            }));
            const codeActions = yield Promise.all(codeActionsPromises);
            // filter out empty code action
            return codeActions.filter((codeAction) => {
                var _a, _b;
                return (_b = (_a = codeAction.edit) === null || _a === void 0 ? void 0 : _a.documentChanges) === null || _b === void 0 ? void 0 : _b.every((change) => change.edits.length > 0);
            });
        });
    }
    /**
     * import quick fix requires the symbol name to be the same as where it's defined.
     * But we have suffix on component default export to prevent conflict with
     * a local variable. So we use auto-import completion as a workaround here.
     */
    getComponentImportQuickFix(start, end, lang, filePath, userPreferences) {
        var _a;
        const sourceFile = (_a = lang.getProgram()) === null || _a === void 0 ? void 0 : _a.getSourceFile(filePath);
        if (!sourceFile) {
            return;
        }
        const node = utils_3.findContainingNode(sourceFile, {
            start,
            length: end - start
        }, (node) => typescript_1.default.isJsxClosingElement(node) || typescript_1.default.isJsxOpeningLikeElement(node));
        if (!node) {
            return;
        }
        const completion = lang.getCompletionsAtPosition(filePath, node.tagName.getEnd(), userPreferences);
        if (!completion) {
            return;
        }
        const name = node.tagName.getText();
        const suffixedName = name + '__SvelteComponent_';
        const errorPreventingUserPreferences = this.completionProvider.fixUserPreferencesForSvelteComponentImport(userPreferences);
        const toFix = (c) => {
            var _a, _b, _c;
            return (_c = (_b = (_a = lang
                .getCompletionEntryDetails(filePath, end, c.name, {}, c.source, errorPreventingUserPreferences, c.data)) === null || _a === void 0 ? void 0 : _a.codeActions) === null || _b === void 0 ? void 0 : _b.map((a) => (Object.assign(Object.assign({}, a), { description: utils_2.changeSvelteComponentName(a.description), fixName: 'import' })))) !== null && _c !== void 0 ? _c : [];
        };
        return utils_1.flatten(completion.entries.filter((c) => c.name === name || c.name === suffixedName).map(toFix));
    }
    getApplicableRefactors(document, range, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!documents_1.isRangeInTag(range, document.scriptInfo) &&
                !documents_1.isRangeInTag(range, document.moduleScriptInfo)) {
                return [];
            }
            // Don't allow refactorings when there is likely a store subscription.
            // Reason: Extracting that would lead to svelte2tsx' transformed store representation
            // showing up, which will confuse the user. In the long run, we maybe have to
            // setup a separate ts language service which only knows of the original script.
            const textInRange = document
                .getText()
                .substring(document.offsetAt(range.start), document.offsetAt(range.end));
            if (textInRange.includes('$')) {
                return [];
            }
            const { lang, tsDoc, userPreferences } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return [];
            }
            const textRange = {
                pos: fragment.offsetAt(fragment.getGeneratedPosition(range.start)),
                end: fragment.offsetAt(fragment.getGeneratedPosition(range.end))
            };
            const applicableRefactors = lang.getApplicableRefactors(document.getFilePath() || '', textRange, userPreferences);
            return (this.applicableRefactorsToCodeActions(applicableRefactors, document, range, textRange)
                // Only allow refactorings from which we know they work
                .filter((refactor) => {
                var _a, _b, _c;
                return ((_a = refactor.command) === null || _a === void 0 ? void 0 : _a.command.includes('function_scope')) ||
                    ((_b = refactor.command) === null || _b === void 0 ? void 0 : _b.command.includes('constant_scope')) ||
                    ((_c = refactor.command) === null || _c === void 0 ? void 0 : _c.command) === 'Infer function return type';
            })
                // The language server also proposes extraction into const/function in module scope,
                // which is outside of the render function, which is svelte2tsx-specific and unmapped,
                // so it would both not work and confuse the user ("What is this render? Never declared that").
                // So filter out the module scope proposal and rename the render-title
                .filter((refactor) => !refactor.title.includes('module scope'))
                .map((refactor) => (Object.assign(Object.assign({}, refactor), { title: refactor.title
                    .replace("Extract to inner function in function 'render'", 'Extract to function')
                    .replace("Extract to constant in function 'render'", 'Extract to constant') }))));
        });
    }
    applicableRefactorsToCodeActions(applicableRefactors, document, originalRange, textRange) {
        return utils_1.flatten(applicableRefactors.map((applicableRefactor) => {
            if (applicableRefactor.inlineable === false) {
                return [
                    vscode_languageserver_1.CodeAction.create(applicableRefactor.description, {
                        title: applicableRefactor.description,
                        command: applicableRefactor.name,
                        arguments: [
                            document.uri,
                            {
                                type: 'refactor',
                                textRange,
                                originalRange,
                                refactorName: 'Extract Symbol'
                            }
                        ]
                    })
                ];
            }
            return applicableRefactor.actions.map((action) => {
                return vscode_languageserver_1.CodeAction.create(action.description, {
                    title: action.description,
                    command: action.name,
                    arguments: [
                        document.uri,
                        {
                            type: 'refactor',
                            textRange,
                            originalRange,
                            refactorName: applicableRefactor.name
                        }
                    ]
                });
            });
        }));
    }
    executeCommand(document, command, args) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!(((_a = args === null || args === void 0 ? void 0 : args[1]) === null || _a === void 0 ? void 0 : _a.type) === 'refactor')) {
                return null;
            }
            const { lang, tsDoc, userPreferences } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const path = document.getFilePath() || '';
            const { refactorName, originalRange, textRange } = args[1];
            const edits = lang.getEditsForRefactor(path, {}, textRange, refactorName, command, userPreferences);
            if (!edits || edits.edits.length === 0) {
                return null;
            }
            const documentChanges = edits === null || edits === void 0 ? void 0 : edits.edits.map((edit) => vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(document.uri, null), edit.textChanges.map((edit) => {
                const range = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, edit.span));
                return vscode_languageserver_1.TextEdit.replace(this.checkEndOfFileCodeInsert(range, originalRange, document), edit.newText);
            })));
            return { documentChanges };
        });
    }
    /**
     * Some refactorings place the new code at the end of svelte2tsx' render function,
     *  which is unmapped. In this case, add it to the end of the script tag ourselves.
     */
    checkEndOfFileCodeInsert(resultRange, targetRange, document) {
        if (resultRange.start.line < 0 || resultRange.end.line < 0) {
            if (documents_1.isRangeInTag(targetRange, document.moduleScriptInfo)) {
                return vscode_languageserver_1.Range.create(document.moduleScriptInfo.endPos, document.moduleScriptInfo.endPos);
            }
            if (document.scriptInfo) {
                return vscode_languageserver_1.Range.create(document.scriptInfo.endPos, document.scriptInfo.endPos);
            }
        }
        return resultRange;
    }
    checkTsNoCheckCodeInsert(document, edit) {
        if (!document.scriptInfo) {
            return undefined;
        }
        const newText = typescript_1.default.sys.newLine + edit.newText;
        return vscode_languageserver_1.TextEdit.insert(document.scriptInfo.startPos, newText);
    }
    checkDisableJsDiagnosticsCodeInsert(originalRange, document, edit) {
        const startOffset = document.offsetAt(originalRange.start);
        const text = document.getText();
        // svetlte2tsx removes export in instance script
        const insertedAfterExport = text.slice(0, startOffset).trim().endsWith('export');
        if (!insertedAfterExport) {
            return vscode_languageserver_1.TextEdit.replace(originalRange, edit.newText);
        }
        const position = document.positionAt(text.lastIndexOf('export', startOffset));
        // fix the length of trailing indent
        const linesOfNewText = edit.newText.split('\n');
        if (/^[ \t]*$/.test(linesOfNewText[linesOfNewText.length - 1])) {
            const line = documents_1.getLineAtPosition(originalRange.start, document.getText());
            const indent = utils_1.getIndent(line);
            linesOfNewText[linesOfNewText.length - 1] = indent;
        }
        return vscode_languageserver_1.TextEdit.insert(position, linesOfNewText.join('\n'));
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
}
exports.CodeActionsProviderImpl = CodeActionsProviderImpl;
//# sourceMappingURL=CodeActionsProvider.js.map