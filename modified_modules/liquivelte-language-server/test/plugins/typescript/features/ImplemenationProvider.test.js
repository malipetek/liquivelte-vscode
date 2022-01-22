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
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const plugins_1 = require("../../../../src/plugins");
const ImplementationProvider_1 = require("../../../../src/plugins/typescript/features/ImplementationProvider");
const utils_1 = require("../../../../src/utils");
const testDir = path_1.default.join(__dirname, '..');
describe('FindReferencesProvider', () => {
    function getFullPath(filename) {
        return path_1.default.join(testDir, 'testfiles', 'implementation', filename);
    }
    function getUri(filename) {
        return utils_1.pathToUrl(getFullPath(filename));
    }
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new plugins_1.LSAndTSDocResolver(docManager, [testDir], new ls_config_1.LSConfigManager());
        const provider = new ImplementationProvider_1.ImplementationProviderImpl(lsAndTsDocResolver);
        const filePath = getFullPath(filename);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath) || ''
        });
        return { provider, document };
    }
    it('find implementations', () => __awaiter(void 0, void 0, void 0, function* () {
        const { document, provider } = setup('implementation.svelte');
        const implementations = yield provider.getImplementation(document, {
            line: 3,
            character: 25
        });
        assert_1.default.deepStrictEqual(implementations, [
            {
                range: {
                    start: {
                        line: 5,
                        character: 24
                    },
                    end: {
                        line: 7,
                        character: 5
                    }
                },
                uri: getUri('implementation.svelte')
            },
            {
                range: {
                    start: {
                        line: 5,
                        character: 11
                    },
                    end: {
                        line: 7,
                        character: 5
                    }
                },
                uri: getUri('some-type.ts')
            }
        ]);
    }));
});
//# sourceMappingURL=ImplemenationProvider.test.js.map