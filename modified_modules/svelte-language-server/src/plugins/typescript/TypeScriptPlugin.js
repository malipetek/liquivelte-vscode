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
exports.TypeScriptPlugin = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../lib/documents");
const utils_1 = require("../../utils");
const CodeActionsProvider_1 = require("./features/CodeActionsProvider");
const CompletionProvider_1 = require("./features/CompletionProvider");
const DiagnosticsProvider_1 = require("./features/DiagnosticsProvider");
const FindReferencesProvider_1 = require("./features/FindReferencesProvider");
const getDirectiveCommentCompletions_1 = require("./features/getDirectiveCommentCompletions");
const HoverProvider_1 = require("./features/HoverProvider");
const ImplementationProvider_1 = require("./features/ImplementationProvider");
const RenameProvider_1 = require("./features/RenameProvider");
const SelectionRangeProvider_1 = require("./features/SelectionRangeProvider");
const SemanticTokensProvider_1 = require("./features/SemanticTokensProvider");
const SignatureHelpProvider_1 = require("./features/SignatureHelpProvider");
const UpdateImportsProvider_1 = require("./features/UpdateImportsProvider");
const utils_2 = require("./features/utils");
const SnapshotManager_1 = require("./SnapshotManager");
const utils_3 = require("./utils");
class TypeScriptPlugin {
    constructor(configManager, lsAndTsDocResolver) {
        this.configManager = configManager;
        this.lsAndTsDocResolver = lsAndTsDocResolver;
        this.completionProvider = new CompletionProvider_1.CompletionsProviderImpl(this.lsAndTsDocResolver, this.configManager);
        this.codeActionsProvider = new CodeActionsProvider_1.CodeActionsProviderImpl(this.lsAndTsDocResolver, this.completionProvider, configManager);
        this.updateImportsProvider = new UpdateImportsProvider_1.UpdateImportsProviderImpl(this.lsAndTsDocResolver);
        this.diagnosticsProvider = new DiagnosticsProvider_1.DiagnosticsProviderImpl(this.lsAndTsDocResolver);
        this.renameProvider = new RenameProvider_1.RenameProviderImpl(this.lsAndTsDocResolver);
        this.hoverProvider = new HoverProvider_1.HoverProviderImpl(this.lsAndTsDocResolver);
        this.findReferencesProvider = new FindReferencesProvider_1.FindReferencesProviderImpl(this.lsAndTsDocResolver);
        this.selectionRangeProvider = new SelectionRangeProvider_1.SelectionRangeProviderImpl(this.lsAndTsDocResolver);
        this.signatureHelpProvider = new SignatureHelpProvider_1.SignatureHelpProviderImpl(this.lsAndTsDocResolver);
        this.semanticTokensProvider = new SemanticTokensProvider_1.SemanticTokensProviderImpl(this.lsAndTsDocResolver);
        this.implementationProvider = new ImplementationProvider_1.ImplementationProviderImpl(this.lsAndTsDocResolver);
    }
    getDiagnostics(document, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('diagnostics')) {
                return [];
            }
            return this.diagnosticsProvider.getDiagnostics(document, cancellationToken);
        });
    }
    doHover(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('hover')) {
                return null;
            }
            return this.hoverProvider.doHover(document, position);
        });
    }
    getDocumentSymbols(document, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('documentSymbols')) {
                return [];
            }
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return [];
            }
            const navTree = lang.getNavigationTree(tsDoc.filePath);
            const symbols = [];
            collectSymbols(navTree, undefined, (symbol) => symbols.push(symbol));
            const topContainerName = symbols[0].name;
            return (symbols
                .slice(1)
                .map((symbol) => {
                if (symbol.containerName === topContainerName) {
                    return Object.assign(Object.assign({}, symbol), { containerName: 'script' });
                }
                return symbol;
            })
                .map((symbol) => documents_1.mapSymbolInformationToOriginal(fragment, symbol))
                // Due to svelte2tsx, there will also be some symbols that are unmapped.
                // Filter those out to keep the lsp from throwing errors.
                // Also filter out transformation artifacts
                .filter((symbol) => symbol.location.range.start.line >= 0 &&
                symbol.location.range.end.line >= 0 &&
                !symbol.name.startsWith('__sveltets_'))
                .map((symbol) => {
                if (symbol.name !== '<function>') {
                    return symbol;
                }
                let name = documents_1.getTextInRange(symbol.location.range, document.getText()).trimLeft();
                if (name.length > 50) {
                    name = name.substring(0, 50) + '...';
                }
                return Object.assign(Object.assign({}, symbol), { name });
            }));
            function collectSymbols(tree, container, cb) {
                const start = tree.spans[0];
                const end = tree.spans[tree.spans.length - 1];
                if (start && end) {
                    cb(vscode_languageserver_1.SymbolInformation.create(tree.text, utils_3.symbolKindFromString(tree.kind), vscode_languageserver_1.Range.create(fragment.positionAt(start.start), fragment.positionAt(end.start + end.length)), fragment.getURL(), container));
                }
                if (tree.childItems) {
                    for (const child of tree.childItems) {
                        collectSymbols(child, tree.text, cb);
                    }
                }
            }
        });
    }
    getCompletions(document, position, completionContext, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('completions')) {
                return null;
            }
            const tsDirectiveCommentCompletions = getDirectiveCommentCompletions_1.getDirectiveCommentCompletions(position, document, completionContext);
            const completions = yield this.completionProvider.getCompletions(document, position, completionContext, cancellationToken);
            if (completions && tsDirectiveCommentCompletions) {
                return vscode_languageserver_1.CompletionList.create(completions.items.concat(tsDirectiveCommentCompletions.items), completions.isIncomplete);
            }
            return completions !== null && completions !== void 0 ? completions : tsDirectiveCommentCompletions;
        });
    }
    resolveCompletion(document, completionItem, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.completionProvider.resolveCompletion(document, completionItem, cancellationToken);
        });
    }
    getDefinitions(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('definitions')) {
                return [];
            }
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const mainFragment = yield tsDoc.getFragment();
            const defs = lang.getDefinitionAndBoundSpan(tsDoc.filePath, mainFragment.offsetAt(mainFragment.getGeneratedPosition(position)));
            if (!defs || !defs.definitions) {
                return [];
            }
            const docs = new utils_2.SnapshotFragmentMap(this.lsAndTsDocResolver);
            docs.set(tsDoc.filePath, { fragment: mainFragment, snapshot: tsDoc });
            const result = yield Promise.all(defs.definitions.map((def) => __awaiter(this, void 0, void 0, function* () {
                const { fragment, snapshot } = yield docs.retrieve(def.fileName);
                if (utils_2.isNoTextSpanInGeneratedCode(snapshot.getFullText(), def.textSpan)) {
                    return vscode_languageserver_1.LocationLink.create(utils_1.pathToUrl(def.fileName), utils_3.convertToLocationRange(fragment, def.textSpan), utils_3.convertToLocationRange(fragment, def.textSpan), utils_3.convertToLocationRange(mainFragment, defs.textSpan));
                }
            })));
            return result.filter(utils_1.isNotNullOrUndefined);
        });
    }
    prepareRename(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('rename')) {
                return null;
            }
            return this.renameProvider.prepareRename(document, position);
        });
    }
    rename(document, position, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('rename')) {
                return null;
            }
            return this.renameProvider.rename(document, position, newName);
        });
    }
    getCodeActions(document, range, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('codeActions')) {
                return [];
            }
            return this.codeActionsProvider.getCodeActions(document, range, context, cancellationToken);
        });
    }
    executeCommand(document, command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('codeActions')) {
                return null;
            }
            return this.codeActionsProvider.executeCommand(document, command, args);
        });
    }
    updateImports(fileRename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.configManager.enabled('svelte.enable') &&
                this.configManager.enabled('svelte.rename.enable'))) {
                return null;
            }
            return this.updateImportsProvider.updateImports(fileRename);
        });
    }
    findReferences(document, position, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('findReferences')) {
                return null;
            }
            return this.findReferencesProvider.findReferences(document, position, context);
        });
    }
    onWatchFileChanges(onWatchFileChangesParas) {
        return __awaiter(this, void 0, void 0, function* () {
            let doneUpdateProjectFiles = false;
            for (const { fileName, changeType } of onWatchFileChangesParas) {
                const pathParts = fileName.split(/\/|\\/);
                const dirPathParts = pathParts.slice(0, pathParts.length - 1);
                if (SnapshotManager_1.ignoredBuildDirectories.some((dir) => dirPathParts.includes(dir))) {
                    continue;
                }
                const scriptKind = utils_3.getScriptKindFromFileName(fileName);
                if (scriptKind === typescript_1.default.ScriptKind.Unknown) {
                    // We don't deal with svelte files here
                    continue;
                }
                if (changeType === vscode_languageserver_1.FileChangeType.Created && !doneUpdateProjectFiles) {
                    doneUpdateProjectFiles = true;
                    yield this.lsAndTsDocResolver.updateProjectFiles();
                }
                else if (changeType === vscode_languageserver_1.FileChangeType.Deleted) {
                    yield this.lsAndTsDocResolver.deleteSnapshot(fileName);
                }
                else {
                    yield this.lsAndTsDocResolver.updateExistingTsOrJsFile(fileName);
                }
            }
        });
    }
    updateTsOrJsFile(fileName, changes) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.lsAndTsDocResolver.updateExistingTsOrJsFile(fileName, changes);
        });
    }
    getSelectionRange(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('selectionRange')) {
                return null;
            }
            return this.selectionRangeProvider.getSelectionRange(document, position);
        });
    }
    getSignatureHelp(document, position, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('signatureHelp')) {
                return null;
            }
            return this.signatureHelpProvider.getSignatureHelp(document, position, context, cancellationToken);
        });
    }
    getSemanticTokens(textDocument, range, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('semanticTokens')) {
                return {
                    data: []
                };
            }
            return this.semanticTokensProvider.getSemanticTokens(textDocument, range, cancellationToken);
        });
    }
    getImplementation(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('implementation')) {
                return null;
            }
            return this.implementationProvider.getImplementation(document, position);
        });
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
    /**
     * @internal Public for tests only
     */
    getSnapshotManager(fileName) {
        return this.lsAndTsDocResolver.getSnapshotManager(fileName);
    }
    featureEnabled(feature) {
        return (this.configManager.enabled('typescript.enable') &&
            this.configManager.enabled(`typescript.${feature}.enable`));
    }
}
exports.TypeScriptPlugin = TypeScriptPlugin;
//# sourceMappingURL=TypeScriptPlugin.js.map