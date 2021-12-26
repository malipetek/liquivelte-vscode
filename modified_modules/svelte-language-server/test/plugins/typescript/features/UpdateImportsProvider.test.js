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
const sinon_1 = require("sinon");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const UpdateImportsProvider_1 = require("../../../../src/plugins/typescript/features/UpdateImportsProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path_1.join(__dirname, '..');
const testFilesDir = path_1.join(testDir, 'testfiles');
describe('UpdateImportsProviderImpl', () => {
    function setup(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
            const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
            const updateImportsProvider = new UpdateImportsProvider_1.UpdateImportsProviderImpl(lsAndTsDocResolver);
            const filePath = path_1.join(testFilesDir, filename);
            const fileUri = utils_1.pathToUrl(filePath);
            const document = docManager.openDocument({
                uri: fileUri,
                text: typescript_1.default.sys.readFile(filePath) || ''
            });
            yield lsAndTsDocResolver.getLSAndTSDoc(document); // this makes sure ts ls knows the file
            return { updateImportsProvider, fileUri };
        });
    }
    afterEach(() => sinon_1.default.restore());
    it('updates imports', () => __awaiter(void 0, void 0, void 0, function* () {
        const { updateImportsProvider, fileUri } = yield setup('updateimports.svelte');
        const workspaceEdit = yield updateImportsProvider.updateImports({
            // imported files both old and new have to actually exist, so we just use some other test files
            oldUri: utils_1.pathToUrl(path_1.join(testFilesDir, 'diagnostics', 'diagnostics.svelte')),
            newUri: utils_1.pathToUrl(path_1.join(testFilesDir, 'documentation.svelte'))
        });
        assert_1.default.deepStrictEqual(workspaceEdit === null || workspaceEdit === void 0 ? void 0 : workspaceEdit.documentChanges, [
            vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(fileUri, null), [
                vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 17), vscode_languageserver_1.Position.create(1, 49)), './documentation.svelte')
            ])
        ]);
    }));
});
//# sourceMappingURL=UpdateImportsProvider.test.js.map