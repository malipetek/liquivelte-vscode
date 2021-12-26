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
exports.SveltePlugin = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const importPackage_1 = require("../../importPackage");
const logger_1 = require("../../logger");
const getCodeActions_1 = require("./features/getCodeActions");
const getCompletions_1 = require("./features/getCompletions");
const getDiagnostics_1 = require("./features/getDiagnostics");
const getHoverInfo_1 = require("./features/getHoverInfo");
const getSelectionRanges_1 = require("./features/getSelectionRanges");
const SvelteDocument_1 = require("./SvelteDocument");
class SveltePlugin {
    constructor(configManager) {
        this.configManager = configManager;
        this.docManager = new Map();
    }
    getDiagnostics(document) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('diagnostics') || !this.configManager.getIsTrusted()) {
                return [];
            }
            return getDiagnostics_1.getDiagnostics(document, yield this.getSvelteDoc(document), this.configManager.getConfig().liquivelte.compilerWarnings);
        });
    }
    getCompiledResult(document) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const svelteDoc = yield this.getSvelteDoc(document);
                return svelteDoc.getCompiledWith({ generate: 'dom' });
            }
            catch (error) {
                return null;
            }
        });
    }
    formatDocument(document, options) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('format')) {
                return [];
            }
            const filePath = document.getFilePath();
            const prettier = importPackage_1.importPrettier(filePath);
            // Try resolving the config through prettier and fall back to possible editor config
            const config = this.configManager.getMergedPrettierConfig(yield prettier.resolveConfig(filePath, { editorconfig: true }), 
            // Be defensive here because IDEs other than VSCode might not have these settings
            options && {
                tabWidth: options.tabSize,
                useTabs: !options.insertSpaces
            });
            // If user has prettier-plugin-svelte 1.x, then remove `options` from the sort
            // order or else it will throw a config error (`options` was not present back then).
            if ((config === null || config === void 0 ? void 0 : config.svelteSortOrder) &&
                ((_a = importPackage_1.getPackageInfo('prettier-plugin-svelte', filePath)) === null || _a === void 0 ? void 0 : _a.version.major) < 2) {
                config.svelteSortOrder = config.svelteSortOrder
                    .replace('-options', '')
                    .replace('options-', '');
            }
            // Take .prettierignore into account
            const fileInfo = yield prettier.getFileInfo(filePath, {
                ignorePath: (_c = (_b = this.configManager.getPrettierConfig()) === null || _b === void 0 ? void 0 : _b.ignorePath) !== null && _c !== void 0 ? _c : '.prettierignore',
                // Sapper places stuff within src/node_modules, we want to format that, too
                withNodeModules: true
            });
            if (fileInfo.ignored) {
                logger_1.Logger.log('File is ignored, formatting skipped');
                return [];
            }
            const formattedCode = prettier.format(document.getText(), Object.assign(Object.assign({}, config), { plugins: getSveltePlugin(), parser: 'svelte' }));
            return document.getText() === formattedCode
                ? []
                : [
                    vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(document.positionAt(0), document.positionAt(document.getTextLength())), formattedCode)
                ];
            function getSveltePlugin() {
                // Only provide our version of the svelte plugin if the user doesn't have one in
                // the workspace already. If we did it, Prettier would - for some reason - use
                // the workspace version for parsing and the extension version for printing,
                // which could crash if the contract of the parser output changed.
                const hasPluginLoadedAlready = prettier
                    .getSupportInfo()
                    .languages.some((l) => l.name === 'svelte');
                return hasPluginLoadedAlready ? [] : [require.resolve('prettier-plugin-svelte')];
            }
        });
    }
    getCompletions(document, position, _, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('completions')) {
                return null;
            }
            const svelteDoc = yield this.getSvelteDoc(document);
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return null;
            }
            return getCompletions_1.getCompletions(document, svelteDoc, position);
        });
    }
    doHover(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('hover')) {
                return null;
            }
            return getHoverInfo_1.getHoverInfo(document, yield this.getSvelteDoc(document), position);
        });
    }
    getCodeActions(document, range, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('codeActions')) {
                return [];
            }
            const svelteDoc = yield this.getSvelteDoc(document);
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return [];
            }
            try {
                return getCodeActions_1.getCodeActions(svelteDoc, range, context);
            }
            catch (error) {
                return [];
            }
        });
    }
    executeCommand(document, command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('codeActions')) {
                return null;
            }
            const svelteDoc = yield this.getSvelteDoc(document);
            try {
                return getCodeActions_1.executeCommand(svelteDoc, command, args);
            }
            catch (error) {
                return null;
            }
        });
    }
    getSelectionRange(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.featureEnabled('selectionRange')) {
                return null;
            }
            const svelteDoc = yield this.getSvelteDoc(document);
            return getSelectionRanges_1.getSelectionRange(svelteDoc, position);
        });
    }
    featureEnabled(feature) {
        return (this.configManager.enabled('svelte.enable') &&
            this.configManager.enabled(`svelte.${feature}.enable`));
    }
    getSvelteDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            let svelteDoc = this.docManager.get(document);
            if (!svelteDoc || svelteDoc.version !== document.version) {
                svelteDoc === null || svelteDoc === void 0 ? void 0 : svelteDoc.destroyTranspiled();
                svelteDoc = new SvelteDocument_1.SvelteDocument(document);
                this.docManager.set(document, svelteDoc);
            }
            return svelteDoc;
        });
    }
}
exports.SveltePlugin = SveltePlugin;
//# sourceMappingURL=SveltePlugin.js.map