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
exports.startServer = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const node_1 = require("vscode-languageserver/node");
const DiagnosticsManager_1 = require("./lib/DiagnosticsManager");
const documents_1 = require("./lib/documents");
const semanticTokenLegend_1 = require("./lib/semanticToken/semanticTokenLegend");
const logger_1 = require("./logger");
const ls_config_1 = require("./ls-config");
const plugins_1 = require("./plugins");
const utils_1 = require("./utils");
const FallbackWatcher_1 = require("./lib/FallbackWatcher");
const configLoader_1 = require("./lib/documents/configLoader");
const importPackage_1 = require("./importPackage");
var TagCloseRequest;
(function (TagCloseRequest) {
    TagCloseRequest.type = new vscode_languageserver_1.RequestType('html/tag');
})(TagCloseRequest || (TagCloseRequest = {}));
/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
function startServer(options) {
    let connection = options === null || options === void 0 ? void 0 : options.connection;
    if (!connection) {
        if (process.argv.includes('--stdio')) {
            console.log = (...args) => {
                console.warn(...args);
            };
            connection = node_1.createConnection(process.stdin, process.stdout);
        }
        else {
            connection = node_1.createConnection(new node_1.IPCMessageReader(process), new node_1.IPCMessageWriter(process));
        }
    }
    if ((options === null || options === void 0 ? void 0 : options.logErrorsOnly) !== undefined) {
        logger_1.Logger.setLogErrorsOnly(options.logErrorsOnly);
    }
    const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
    const configManager = new ls_config_1.LSConfigManager();
    const pluginHost = new plugins_1.PluginHost(docManager);
    let sveltePlugin = undefined;
    let watcher;
    connection.onInitialize((evt) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
        const workspaceUris = (_b = (_a = evt.workspaceFolders) === null || _a === void 0 ? void 0 : _a.map((folder) => folder.uri.toString())) !== null && _b !== void 0 ? _b : [
            (_c = evt.rootUri) !== null && _c !== void 0 ? _c : ''
        ];
        logger_1.Logger.log('Initialize language server at ', workspaceUris.join(', '));
        if (workspaceUris.length === 0) {
            logger_1.Logger.error('No workspace path set');
        }
        if (!((_d = evt.capabilities.workspace) === null || _d === void 0 ? void 0 : _d.didChangeWatchedFiles)) {
            const workspacePaths = workspaceUris.map(utils_1.urlToPath).filter(utils_1.isNotNullOrUndefined);
            watcher = new FallbackWatcher_1.FallbackWatcher('**/*.{ts,js}', workspacePaths);
            watcher.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
        }
        const isTrusted = (_f = (_e = evt.initializationOptions) === null || _e === void 0 ? void 0 : _e.isTrusted) !== null && _f !== void 0 ? _f : true;
        configLoader_1.configLoader.setDisabled(!isTrusted);
        importPackage_1.setIsTrusted(isTrusted);
        configManager.updateIsTrusted(isTrusted);
        if (!isTrusted) {
            logger_1.Logger.log('Workspace is not trusted, running with reduced capabilities.');
        }
        // Backwards-compatible way of setting initialization options (first `||` is the old style)
        configManager.update(((_j = (_h = (_g = evt.initializationOptions) === null || _g === void 0 ? void 0 : _g.configuration) === null || _h === void 0 ? void 0 : _h.svelte) === null || _j === void 0 ? void 0 : _j.plugin) ||
            ((_k = evt.initializationOptions) === null || _k === void 0 ? void 0 : _k.config) ||
            {});
        configManager.updateTsJsUserPreferences(((_l = evt.initializationOptions) === null || _l === void 0 ? void 0 : _l.configuration) ||
            ((_m = evt.initializationOptions) === null || _m === void 0 ? void 0 : _m.typescriptConfig) ||
            {});
        configManager.updateEmmetConfig(((_p = (_o = evt.initializationOptions) === null || _o === void 0 ? void 0 : _o.configuration) === null || _p === void 0 ? void 0 : _p.emmet) ||
            ((_q = evt.initializationOptions) === null || _q === void 0 ? void 0 : _q.emmetConfig) ||
            {});
        configManager.updatePrettierConfig(((_s = (_r = evt.initializationOptions) === null || _r === void 0 ? void 0 : _r.configuration) === null || _s === void 0 ? void 0 : _s.prettier) ||
            ((_t = evt.initializationOptions) === null || _t === void 0 ? void 0 : _t.prettierConfig) ||
            {});
        // no old style as these were added later
        configManager.updateCssConfig((_v = (_u = evt.initializationOptions) === null || _u === void 0 ? void 0 : _u.configuration) === null || _v === void 0 ? void 0 : _v.css);
        configManager.updateScssConfig((_x = (_w = evt.initializationOptions) === null || _w === void 0 ? void 0 : _w.configuration) === null || _x === void 0 ? void 0 : _x.scss);
        configManager.updateLessConfig((_z = (_y = evt.initializationOptions) === null || _y === void 0 ? void 0 : _y.configuration) === null || _z === void 0 ? void 0 : _z.less);
        pluginHost.initialize({
            filterIncompleteCompletions: !((_0 = evt.initializationOptions) === null || _0 === void 0 ? void 0 : _0.dontFilterIncompleteCompletions),
            definitionLinkSupport: !!((_2 = (_1 = evt.capabilities.textDocument) === null || _1 === void 0 ? void 0 : _1.definition) === null || _2 === void 0 ? void 0 : _2.linkSupport)
        });
        pluginHost.register((sveltePlugin = new plugins_1.SveltePlugin(configManager)));
        pluginHost.register(new plugins_1.HTMLPlugin(docManager, configManager));
        pluginHost.register(new plugins_1.CSSPlugin(docManager, configManager));
        pluginHost.register(new plugins_1.TypeScriptPlugin(configManager, new plugins_1.LSAndTSDocResolver(docManager, workspaceUris.map(utils_1.normalizeUri), configManager, notifyTsServiceExceedSizeLimit)));
        const clientSupportApplyEditCommand = !!((_3 = evt.capabilities.workspace) === null || _3 === void 0 ? void 0 : _3.applyEdit);
        return {
            capabilities: {
                textDocumentSync: {
                    openClose: true,
                    change: vscode_languageserver_1.TextDocumentSyncKind.Incremental,
                    save: {
                        includeText: false
                    }
                },
                hoverProvider: true,
                completionProvider: {
                    resolveProvider: true,
                    triggerCharacters: [
                        '.',
                        '"',
                        "'",
                        '`',
                        '/',
                        '@',
                        '<',
                        // Emmet
                        '>',
                        '*',
                        '#',
                        '$',
                        '+',
                        '^',
                        '(',
                        '[',
                        '@',
                        '-',
                        // No whitespace because
                        // it makes for weird/too many completions
                        // of other completion providers
                        // Svelte
                        ':',
                        '|'
                    ]
                },
                documentFormattingProvider: true,
                colorProvider: true,
                documentSymbolProvider: true,
                definitionProvider: true,
                codeActionProvider: ((_5 = (_4 = evt.capabilities.textDocument) === null || _4 === void 0 ? void 0 : _4.codeAction) === null || _5 === void 0 ? void 0 : _5.codeActionLiteralSupport)
                    ? {
                        codeActionKinds: [
                            vscode_languageserver_1.CodeActionKind.QuickFix,
                            vscode_languageserver_1.CodeActionKind.SourceOrganizeImports,
                            ...(clientSupportApplyEditCommand ? [vscode_languageserver_1.CodeActionKind.Refactor] : [])
                        ]
                    }
                    : true,
                executeCommandProvider: clientSupportApplyEditCommand
                    ? {
                        commands: [
                            'function_scope_0a',
                            'function_scope_1a',
                            'function_scope_2a',
                            'function_scope_3a',
                            'constant_scope_0a',
                            'constant_scope_1a',
                            'constant_scope_2a',
                            'constant_scope_3a',
                            'extract_to_svelte_componenta',
                            'Infer function return typea'
                        ]
                    }
                    : undefined,
                renameProvider: ((_7 = (_6 = evt.capabilities.textDocument) === null || _6 === void 0 ? void 0 : _6.rename) === null || _7 === void 0 ? void 0 : _7.prepareSupport)
                    ? { prepareProvider: true }
                    : true,
                referencesProvider: true,
                selectionRangeProvider: true,
                signatureHelpProvider: {
                    triggerCharacters: ['(', ',', '<'],
                    retriggerCharacters: [')']
                },
                semanticTokensProvider: {
                    legend: semanticTokenLegend_1.getSemanticTokenLegends(),
                    range: true,
                    full: true
                },
                linkedEditingRangeProvider: true,
                implementationProvider: true
            }
        };
    });
    function notifyTsServiceExceedSizeLimit() {
        connection === null || connection === void 0 ? void 0 : connection.sendNotification(vscode_languageserver_1.ShowMessageNotification.type, {
            message: 'Svelte language server detected a large amount of JS/Svelte files. ' +
                'To enable project-wide JavaScript/TypeScript language features for Svelte files,' +
                'exclude large folders in the tsconfig.json or jsconfig.json with source files that you do not work on.',
            type: vscode_languageserver_1.MessageType.Warning
        });
    }
    connection.onExit(() => {
        watcher === null || watcher === void 0 ? void 0 : watcher.dispose();
    });
    connection.onRenameRequest((req) => pluginHost.rename(req.textDocument, req.position, req.newName));
    connection.onPrepareRename((req) => pluginHost.prepareRename(req.textDocument, req.position));
    connection.onDidChangeConfiguration(({ settings }) => {
        var _a;
        configManager.update((_a = settings.svelte) === null || _a === void 0 ? void 0 : _a.plugin);
        configManager.updateTsJsUserPreferences(settings);
        configManager.updateEmmetConfig(settings.emmet);
        configManager.updatePrettierConfig(settings.prettier);
        configManager.updateCssConfig(settings.css);
        configManager.updateScssConfig(settings.scss);
        configManager.updateLessConfig(settings.less);
    });
    connection.onDidOpenTextDocument((evt) => {
        docManager.openDocument(evt.textDocument);
        docManager.markAsOpenedInClient(evt.textDocument.uri);
    });
    connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
    connection.onDidChangeTextDocument((evt) => {
        docManager.updateDocument(evt.textDocument, evt.contentChanges);
        pluginHost.didUpdateDocument();
    });
    connection.onHover((evt) => pluginHost.doHover(evt.textDocument, evt.position));
    connection.onCompletion((evt, cancellationToken) => pluginHost.getCompletions(evt.textDocument, evt.position, evt.context, cancellationToken));
    connection.onDocumentFormatting((evt) => pluginHost.formatDocument(evt.textDocument, evt.options));
    connection.onRequest(TagCloseRequest.type, (evt) => pluginHost.doTagComplete(evt.textDocument, evt.position));
    connection.onDocumentColor((evt) => pluginHost.getDocumentColors(evt.textDocument));
    connection.onColorPresentation((evt) => pluginHost.getColorPresentations(evt.textDocument, evt.range, evt.color));
    connection.onDocumentSymbol((evt, cancellationToken) => pluginHost.getDocumentSymbols(evt.textDocument, cancellationToken));
    connection.onDefinition((evt) => pluginHost.getDefinitions(evt.textDocument, evt.position));
    connection.onReferences((evt) => pluginHost.findReferences(evt.textDocument, evt.position, evt.context));
    connection.onCodeAction((evt, cancellationToken) => pluginHost.getCodeActions(evt.textDocument, evt.range, evt.context, cancellationToken));
    connection.onExecuteCommand((evt) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const result = yield pluginHost.executeCommand({ uri: (_a = evt.arguments) === null || _a === void 0 ? void 0 : _a[0] }, evt.command, evt.arguments);
        if (vscode_languageserver_1.WorkspaceEdit.is(result)) {
            const edit = { edit: result };
            connection === null || connection === void 0 ? void 0 : connection.sendRequest(vscode_languageserver_1.ApplyWorkspaceEditRequest.type.method, edit);
        }
        else if (result) {
            connection === null || connection === void 0 ? void 0 : connection.sendNotification(vscode_languageserver_1.ShowMessageNotification.type.method, {
                message: result,
                type: vscode_languageserver_1.MessageType.Error
            });
        }
    }));
    connection.onCompletionResolve((completionItem, cancellationToken) => {
        const data = completionItem.data;
        if (!data) {
            return completionItem;
        }
        return pluginHost.resolveCompletion(data, completionItem, cancellationToken);
    });
    connection.onSignatureHelp((evt, cancellationToken) => pluginHost.getSignatureHelp(evt.textDocument, evt.position, evt.context, cancellationToken));
    connection.onSelectionRanges((evt) => pluginHost.getSelectionRanges(evt.textDocument, evt.positions));
    connection.onImplementation((evt) => pluginHost.getImplementation(evt.textDocument, evt.position));
    const diagnosticsManager = new DiagnosticsManager_1.DiagnosticsManager(connection.sendDiagnostics, docManager, pluginHost.getDiagnostics.bind(pluginHost));
    const updateAllDiagnostics = utils_1.debounceThrottle(() => diagnosticsManager.updateAll(), 1000);
    connection.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
    function onDidChangeWatchedFiles(para) {
        const onWatchFileChangesParas = para.changes
            .map((change) => ({
            fileName: utils_1.urlToPath(change.uri),
            changeType: change.type
        }))
            .filter((change) => !!change.fileName);
        pluginHost.onWatchFileChanges(onWatchFileChangesParas);
        updateAllDiagnostics();
    }
    connection.onDidSaveTextDocument(updateAllDiagnostics);
    connection.onNotification('$/onDidChangeTsOrJsFile', (e) => __awaiter(this, void 0, void 0, function* () {
        const path = utils_1.urlToPath(e.uri);
        if (path) {
            pluginHost.updateTsOrJsFile(path, e.changes);
        }
        updateAllDiagnostics();
    }));
    connection.onRequest(vscode_languageserver_1.SemanticTokensRequest.type, (evt, cancellationToken) => pluginHost.getSemanticTokens(evt.textDocument, undefined, cancellationToken));
    connection.onRequest(vscode_languageserver_1.SemanticTokensRangeRequest.type, (evt, cancellationToken) => pluginHost.getSemanticTokens(evt.textDocument, evt.range, cancellationToken));
    connection.onRequest(vscode_languageserver_1.LinkedEditingRangeRequest.type, (evt) => __awaiter(this, void 0, void 0, function* () { return yield pluginHost.getLinkedEditingRanges(evt.textDocument, evt.position); }));
    docManager.on('documentChange', utils_1.debounceThrottle((document) => __awaiter(this, void 0, void 0, function* () { return diagnosticsManager.update(document); }), 750));
    docManager.on('documentClose', (document) => diagnosticsManager.removeDiagnostics(document));
    // The language server protocol does not have a specific "did rename/move files" event,
    // so we create our own in the extension client and handle it here
    connection.onRequest('$/getEditsForFileRename', (fileRename) => __awaiter(this, void 0, void 0, function* () { return pluginHost.updateImports(fileRename); }));
    connection.onRequest('$/getCompiledCode', (uri) => __awaiter(this, void 0, void 0, function* () {
        const doc = docManager.get(uri);
        if (!doc) {
            return null;
        }
        if (doc) {
            const compiled = yield sveltePlugin.getCompiledResult(doc);
            if (compiled) {
                const js = compiled.js;
                const css = compiled.css;
                return { js, css };
            }
            else {
                return null;
            }
        }
    }));
    connection.listen();
}
exports.startServer = startServer;
//# sourceMappingURL=server.js.map