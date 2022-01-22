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
exports.SvelteCheck = void 0;
const path_1 = require("path");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("./lib/documents");
const logger_1 = require("./logger");
const ls_config_1 = require("./ls-config");
const plugins_1 = require("./plugins");
const utils_1 = require("./plugins/typescript/utils");
const utils_2 = require("./utils");
/**
 * Small wrapper around PluginHost's Diagnostic Capabilities
 * for svelte-check, without the overhead of the lsp.
 */
class SvelteCheck {
    constructor(workspacePath, options = {}) {
        this.options = options;
        this.docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        this.configManager = new ls_config_1.LSConfigManager();
        this.pluginHost = new plugins_1.PluginHost(this.docManager);
        logger_1.Logger.setLogErrorsOnly(true);
        this.initialize(workspacePath, options);
    }
    initialize(workspacePath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.tsconfig && !path_1.isAbsolute(options.tsconfig)) {
                throw new Error('tsconfigPath needs to be absolute, got ' + options.tsconfig);
            }
            this.configManager.update({
                liquivelte: {
                    compilerWarnings: options.compilerWarnings
                }
            });
            // No HTMLPlugin, it does not provide diagnostics
            if (shouldRegister('liquivelte')) {
                this.pluginHost.register(new plugins_1.SveltePlugin(this.configManager));
            }
            if (shouldRegister('css')) {
                this.pluginHost.register(new plugins_1.CSSPlugin(this.docManager, this.configManager));
            }
            if (shouldRegister('js') || options.tsconfig) {
                this.lsAndTSDocResolver = new plugins_1.LSAndTSDocResolver(this.docManager, [utils_2.pathToUrl(workspacePath)], this.configManager, undefined, true, options.tsconfig);
                this.pluginHost.register(new plugins_1.TypeScriptPlugin(this.configManager, this.lsAndTSDocResolver));
            }
            function shouldRegister(source) {
                return !options.diagnosticSources || options.diagnosticSources.includes(source);
            }
        });
    }
    /**
     * Creates/updates given document
     *
     * @param doc Text and Uri of the document
     * @param isNew Whether or not this is the creation of the document
     */
    upsertDocument(doc, isNew) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = utils_2.urlToPath(doc.uri) || '';
            if (isNew && this.options.tsconfig) {
                const lsContainer = yield this.getLSContainer(this.options.tsconfig);
                if (!lsContainer.fileBelongsToProject(filePath)) {
                    return;
                }
            }
            if (doc.uri.endsWith('.ts') || doc.uri.endsWith('.js')) {
                this.pluginHost.updateTsOrJsFile(filePath, [
                    {
                        range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(Number.MAX_VALUE, Number.MAX_VALUE)),
                        text: doc.text
                    }
                ]);
            }
            else {
                this.docManager.openDocument({
                    text: doc.text,
                    uri: doc.uri
                });
                this.docManager.markAsOpenedInClient(doc.uri);
            }
        });
    }
    /**
     * Removes/closes document
     *
     * @param uri Uri of the document
     */
    removeDocument(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.docManager.get(uri)) {
                return;
            }
            this.docManager.closeDocument(uri);
            this.docManager.releaseDocument(uri);
            if (this.options.tsconfig) {
                const lsContainer = yield this.getLSContainer(this.options.tsconfig);
                lsContainer.deleteSnapshot(utils_2.urlToPath(uri) || '');
            }
        });
    }
    /**
     * Gets the diagnostics for all currently open files.
     */
    getDiagnostics() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.tsconfig) {
                return this.getDiagnosticsForTsconfig(this.options.tsconfig);
            }
            return yield Promise.all(this.docManager.getAllOpenedByClient().map((doc) => __awaiter(this, void 0, void 0, function* () {
                const uri = doc[1].uri;
                return yield this.getDiagnosticsForFile(uri);
            })));
        });
    }
    getDiagnosticsForTsconfig(tsconfigPath) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const lsContainer = yield this.getLSContainer(tsconfigPath);
            const lang = lsContainer.getService();
            const files = ((_a = lang.getProgram()) === null || _a === void 0 ? void 0 : _a.getSourceFiles()) || [];
            const options = ((_b = lang.getProgram()) === null || _b === void 0 ? void 0 : _b.getCompilerOptions()) || {};
            return yield Promise.all(files.map((file) => {
                const uri = utils_2.pathToUrl(file.fileName);
                const doc = this.docManager.get(uri);
                if (doc) {
                    this.docManager.markAsOpenedInClient(uri);
                    return this.getDiagnosticsForFile(uri);
                }
                else {
                    // This check is done inside TS mostly, too, but for some diagnostics like suggestions it
                    // doesn't apply to all code paths. That's why we do it here, too.
                    const skipDiagnosticsForFile = (options.skipLibCheck && file.isDeclarationFile) ||
                        (options.skipDefaultLibCheck && file.hasNoDefaultLib);
                    const diagnostics = skipDiagnosticsForFile
                        ? []
                        : [
                            ...lang.getSyntacticDiagnostics(file.fileName),
                            ...lang.getSuggestionDiagnostics(file.fileName),
                            ...lang.getSemanticDiagnostics(file.fileName)
                        ].map((diagnostic) => ({
                            range: utils_1.convertRange({ positionAt: file.getLineAndCharacterOfPosition.bind(file) }, diagnostic),
                            severity: utils_1.mapSeverity(diagnostic.category),
                            source: diagnostic.source,
                            message: typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                            code: diagnostic.code,
                            tags: utils_1.getDiagnosticTag(diagnostic)
                        }));
                    return {
                        filePath: file.fileName,
                        text: file.text,
                        diagnostics
                    };
                }
            }));
        });
    }
    getDiagnosticsForFile(uri) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const diagnostics = yield this.pluginHost.getDiagnostics({ uri });
            return {
                filePath: utils_2.urlToPath(uri) || '',
                text: ((_a = this.docManager.get(uri)) === null || _a === void 0 ? void 0 : _a.getText()) || '',
                diagnostics
            };
        });
    }
    getLSContainer(tsconfigPath) {
        if (!this.lsAndTSDocResolver) {
            throw new Error('Cannot run with tsconfig path without LS/TSdoc resolver');
        }
        return this.lsAndTSDocResolver.getTSService(tsconfigPath);
    }
}
exports.SvelteCheck = SvelteCheck;
//# sourceMappingURL=svelte-check.js.map