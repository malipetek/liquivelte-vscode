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
const assert_1 = require("assert");
const path_1 = require("path");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const CodeActionsProvider_1 = require("../../../../src/plugins/typescript/features/CodeActionsProvider");
const CompletionProvider_1 = require("../../../../src/plugins/typescript/features/CompletionProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testFilesDir = path_1.join(__dirname, '..', 'testfiles', 'preferences');
describe('ts user preferences', () => {
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const filePath = path_1.join(testFilesDir, filename);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath) || ''
        });
        return { document, docManager };
    }
    const expectedImportEdit = "import { definition } from '~/definition/index';";
    function getPreferences() {
        return {
            preferences: {
                importModuleSpecifier: 'non-relative',
                importModuleSpecifierEnding: 'index',
                quoteStyle: 'single'
            },
            suggest: {
                autoImports: true,
                includeAutomaticOptionalChainCompletions: undefined,
                includeCompletionsForImportStatements: undefined
            }
        };
    }
    function createLSAndTSDocResolver(docManager, preferences) {
        const configManager = new ls_config_1.LSConfigManager();
        configManager.updateTsJsUserPreferences({
            typescript: Object.assign(Object.assign({}, getPreferences()), preferences),
            javascript: Object.assign(Object.assign({}, getPreferences()), preferences)
        });
        return new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testFilesDir)], configManager);
    }
    it('provides auto import completion according to preferences', () => __awaiter(void 0, void 0, void 0, function* () {
        const { docManager, document } = setup('code-action.svelte');
        const lsAndTsDocResolver = createLSAndTSDocResolver(docManager);
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 14));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'definition');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits[0].newText.trim(), expectedImportEdit);
    }));
    function importCodeActionTest(filename, range, context) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { docManager, document } = setup(filename);
            const lsAndTsDocResolver = createLSAndTSDocResolver(docManager);
            const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
            const codeActionProvider = new CodeActionsProvider_1.CodeActionsProviderImpl(lsAndTsDocResolver, completionProvider, new ls_config_1.LSConfigManager());
            const codeAction = yield codeActionProvider.getCodeActions(document, range, context);
            const documentChange = (_b = (_a = codeAction[0].edit) === null || _a === void 0 ? void 0 : _a.documentChanges) === null || _b === void 0 ? void 0 : _b[0];
            assert_1.default.strictEqual(documentChange === null || documentChange === void 0 ? void 0 : documentChange.edits[0].newText.trim(), expectedImportEdit);
        });
    }
    it('provides auto import code action according to preferences', () => __awaiter(void 0, void 0, void 0, function* () {
        const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 14));
        yield importCodeActionTest('code-action.svelte', range, {
            diagnostics: [
                vscode_languageserver_1.Diagnostic.create(range, "Cannot find name 'definition'", vscode_languageserver_1.DiagnosticSeverity.Error, 2304, 'ts')
            ]
        });
    }));
    it('provides auto import suggestions according to preferences', () => __awaiter(void 0, void 0, void 0, function* () {
        const { docManager, document } = setup('code-action.svelte');
        const lsAndTsDocResolver = createLSAndTSDocResolver(docManager, {
            suggest: {
                autoImports: false,
                includeAutomaticOptionalChainCompletions: undefined,
                includeCompletionsForImportStatements: undefined
            }
        });
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 14));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'definition');
        assert_1.default.strictEqual(item, undefined, 'Expected no auto import suggestions');
    }));
    const expectedComponentImportEdit = "import Imports from '~/imports.svelte';";
    function setupImportModuleSpecifierEndingJs() {
        const { docManager, document } = setup('module-specifier-js.svelte');
        const lsAndTsDocResolver = createLSAndTSDocResolver(docManager, {
            preferences: {
                importModuleSpecifier: 'non-relative',
                importModuleSpecifierEnding: 'js',
                quoteStyle: 'single'
            }
        });
        return { document, lsAndTsDocResolver };
    }
    it('provides auto import for svelte component when importModuleSpecifierEnding is js', () => __awaiter(void 0, void 0, void 0, function* () {
        const { document, lsAndTsDocResolver } = setupImportModuleSpecifierEndingJs();
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(4, 8));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'Imports');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits[0].newText.trim(), expectedComponentImportEdit);
    }));
    it('provides auto import for context="module" export when importModuleSpecifierEnding is js', () => __awaiter(void 0, void 0, void 0, function* () {
        const { document, lsAndTsDocResolver } = setupImportModuleSpecifierEndingJs();
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 6));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'hi');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits[0].newText.trim(), "import { hi } from '~/with-context-module.svelte';");
    }));
    it('provides import code action for svelte component when importModuleSpecifierEnding is js', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(4, 1), vscode_languageserver_1.Position.create(4, 8));
        const { document, lsAndTsDocResolver } = setupImportModuleSpecifierEndingJs();
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const codeActionProvider = new CodeActionsProvider_1.CodeActionsProviderImpl(lsAndTsDocResolver, completionProvider, new ls_config_1.LSConfigManager());
        const codeAction = yield codeActionProvider.getCodeActions(document, range, {
            diagnostics: [
                vscode_languageserver_1.Diagnostic.create(range, "Cannot find name 'Imports'", vscode_languageserver_1.DiagnosticSeverity.Error, 2304, 'ts')
            ]
        });
        const documentChange = (_b = (_a = codeAction[0].edit) === null || _a === void 0 ? void 0 : _a.documentChanges) === null || _b === void 0 ? void 0 : _b[0];
        assert_1.default.strictEqual(documentChange === null || documentChange === void 0 ? void 0 : documentChange.edits[0].newText.trim(), expectedComponentImportEdit);
    }));
});
//# sourceMappingURL=preferences.test.js.map