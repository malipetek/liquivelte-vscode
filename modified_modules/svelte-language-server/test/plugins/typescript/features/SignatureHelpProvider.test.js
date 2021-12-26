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
const path_1 = require("path");
const assert_1 = require("assert");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const SignatureHelpProvider_1 = require("../../../../src/plugins/typescript/features/SignatureHelpProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const ls_config_1 = require("../../../../src/ls-config");
const testDir = path_1.default.join(__dirname, '..');
describe('SignatureHelpProvider', () => {
    function setup() {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const filePath = path_1.default.join(testDir, 'testfiles', 'signature-help', 'signature-help.svelte');
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const provider = new SignatureHelpProvider_1.SignatureHelpProviderImpl(lsAndTsDocResolver);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath)
        });
        return { provider, document };
    }
    it('provide signature help with formatted documentation', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const result = yield provider.getSignatureHelp(document, vscode_languageserver_1.Position.create(3, 8), undefined);
        assert_1.default.deepStrictEqual(result, {
            signatures: [
                {
                    label: 'foo(): boolean',
                    documentation: { value: 'bars\n\n*@author* — John', kind: vscode_languageserver_1.MarkupKind.Markdown },
                    parameters: []
                }
            ],
            activeParameter: 0,
            activeSignature: 0
        });
    }));
    it('provide signature help with function signatures', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const result = yield provider.getSignatureHelp(document, vscode_languageserver_1.Position.create(4, 12), undefined);
        assert_1.default.deepStrictEqual(result, {
            signatures: [
                {
                    label: 'abc(a: number, b: number): string',
                    documentation: undefined,
                    parameters: [
                        {
                            label: [4, 13]
                        },
                        {
                            label: [15, 24]
                        }
                    ]
                },
                {
                    label: 'abc(a: number, b: string): string',
                    documentation: undefined,
                    parameters: [
                        {
                            label: [4, 13]
                        },
                        {
                            label: [15, 24],
                            documentation: 'formatted number'
                        }
                    ]
                }
            ],
            activeParameter: 1,
            activeSignature: 1
        });
    }));
    it('filter out svelte2tsx signature', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const result = yield provider.getSignatureHelp(document, vscode_languageserver_1.Position.create(18, 18), undefined);
        assert_1.default.equal(result, null);
    }));
    it('provide signature help with formatted documentation', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const signatureHelpPromise = provider.getSignatureHelp(document, vscode_languageserver_1.Position.create(3, 8), undefined, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert_1.default.deepStrictEqual(yield signatureHelpPromise, null);
    }));
});
//# sourceMappingURL=SignatureHelpProvider.test.js.map