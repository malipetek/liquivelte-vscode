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
const typescript_1 = require("typescript");
const assert_1 = require("assert");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const SelectionRangeProvider_1 = require("../../../../src/plugins/typescript/features/SelectionRangeProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const ls_config_1 = require("../../../../src/ls-config");
const testDir = path_1.default.join(__dirname, '..');
describe('SelectionRangeProvider', () => {
    function setup() {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const filePath = path_1.default.join(testDir, 'testfiles', 'selection-range', 'selection-range.svelte');
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const provider = new SelectionRangeProvider_1.SelectionRangeProviderImpl(lsAndTsDocResolver);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath)
        });
        return { provider, document };
    }
    it('provides selection range', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const selectionRange = yield provider.getSelectionRange(document, vscode_languageserver_1.Position.create(1, 9));
        assert_1.default.deepStrictEqual(selectionRange, {
            parent: {
                parent: undefined,
                // let a;
                range: {
                    end: {
                        character: 10,
                        line: 1
                    },
                    start: {
                        character: 4,
                        line: 1
                    }
                }
            },
            // a
            range: {
                end: {
                    character: 9,
                    line: 1
                },
                start: {
                    character: 8,
                    line: 1
                }
            }
        });
    }));
    it('return null when in style', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup();
        const selectionRange = yield provider.getSelectionRange(document, vscode_languageserver_1.Position.create(5, 0));
        assert_1.default.equal(selectionRange, null);
    }));
});
//# sourceMappingURL=SelectionRangeProvider.test.js.map