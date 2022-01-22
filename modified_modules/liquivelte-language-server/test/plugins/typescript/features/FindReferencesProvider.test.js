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
const assert = require("assert");
const path = require("path");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const FindReferencesProvider_1 = require("../../../../src/plugins/typescript/features/FindReferencesProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path.join(__dirname, '..');
describe('FindReferencesProvider', () => {
    function getFullPath(filename) {
        return path.join(testDir, 'testfiles', filename);
    }
    function getUri(filename) {
        const filePath = path.join(testDir, 'testfiles', filename);
        return utils_1.pathToUrl(filePath);
    }
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [testDir], new ls_config_1.LSConfigManager());
        const provider = new FindReferencesProvider_1.FindReferencesProviderImpl(lsAndTsDocResolver);
        const document = openDoc(filename);
        return { provider, document };
        function openDoc(filename) {
            const filePath = getFullPath(filename);
            const doc = docManager.openDocument({
                uri: utils_1.pathToUrl(filePath),
                text: typescript_1.default.sys.readFile(filePath) || ''
            });
            return doc;
        }
    }
    function test(position, includeDeclaration) {
        return __awaiter(this, void 0, void 0, function* () {
            const { provider, document } = setup('find-references.svelte');
            const results = yield provider.findReferences(document, position, { includeDeclaration });
            let expectedResults = [
                vscode_languageserver_1.Location.create(getUri('find-references.svelte'), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(2, 8), vscode_languageserver_1.Position.create(2, 14))),
                vscode_languageserver_1.Location.create(getUri('find-references.svelte'), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(3, 8), vscode_languageserver_1.Position.create(3, 14)))
            ];
            if (includeDeclaration) {
                expectedResults = [
                    vscode_languageserver_1.Location.create(getUri('find-references.svelte'), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 10), vscode_languageserver_1.Position.create(1, 16)))
                ].concat(expectedResults);
            }
            assert.deepStrictEqual(results, expectedResults);
        });
    }
    it('finds references', () => __awaiter(void 0, void 0, void 0, function* () {
        yield test(vscode_languageserver_1.Position.create(1, 11), true);
    }));
    it('finds references, exluding definition', () => __awaiter(void 0, void 0, void 0, function* () {
        yield test(vscode_languageserver_1.Position.create(1, 11), false);
    }));
    it('finds references (not searching from declaration)', () => __awaiter(void 0, void 0, void 0, function* () {
        yield test(vscode_languageserver_1.Position.create(2, 8), true);
    }));
    it('finds references for $store', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('find-references-$store.svelte');
        const results = yield provider.findReferences(document, vscode_languageserver_1.Position.create(2, 10), {
            includeDeclaration: true
        });
        assert.deepStrictEqual(results, [
            {
                range: {
                    end: {
                        character: 16,
                        line: 1
                    },
                    start: {
                        character: 10,
                        line: 1
                    }
                },
                uri: getUri('find-references-$store.svelte')
            },
            {
                range: {
                    end: {
                        character: 15,
                        line: 2
                    },
                    start: {
                        character: 9,
                        line: 2
                    }
                },
                uri: getUri('find-references-$store.svelte')
            },
            {
                range: {
                    end: {
                        character: 15,
                        line: 3
                    },
                    start: {
                        character: 9,
                        line: 3
                    }
                },
                uri: getUri('find-references-$store.svelte')
            },
            {
                range: {
                    end: {
                        character: 8,
                        line: 7
                    },
                    start: {
                        character: 2,
                        line: 7
                    }
                },
                uri: getUri('find-references-$store.svelte')
            }
        ]);
    }));
    it('ignores references inside generated code', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('find-references-ignore-generated.svelte');
        const results = yield provider.findReferences(document, vscode_languageserver_1.Position.create(1, 8), {
            includeDeclaration: true
        });
        assert.deepStrictEqual(results, [
            {
                range: {
                    end: {
                        character: 9,
                        line: 1
                    },
                    start: {
                        character: 8,
                        line: 1
                    }
                },
                uri: getUri('find-references-ignore-generated.svelte')
            },
            {
                range: {
                    end: {
                        character: 6,
                        line: 5
                    },
                    start: {
                        character: 5,
                        line: 5
                    }
                },
                uri: getUri('find-references-ignore-generated.svelte')
            },
            {
                range: {
                    end: {
                        character: 21,
                        line: 7
                    },
                    start: {
                        character: 20,
                        line: 7
                    }
                },
                uri: getUri('find-references-ignore-generated.svelte')
            }
        ]);
    }));
    it('ignores references inside generated TSX code', () => __awaiter(void 0, void 0, void 0, function* () {
        const file = 'find-references-ignore-generated-tsx.svelte';
        const uri = getUri(file);
        const { provider, document } = setup(file);
        const pos = vscode_languageserver_1.Position.create(3, 15);
        const results = yield provider.findReferences(document, pos, {
            includeDeclaration: true
        });
        assert.deepStrictEqual(results, [
            {
                uri,
                range: {
                    start: {
                        line: 1,
                        character: 13
                    },
                    end: {
                        line: 1,
                        character: 16
                    }
                }
            },
            {
                uri,
                range: {
                    start: {
                        line: 3,
                        character: 14
                    },
                    end: {
                        line: 3,
                        character: 17
                    }
                }
            },
            {
                uri,
                range: {
                    start: {
                        line: 7,
                        character: 4
                    },
                    end: {
                        line: 7,
                        character: 7
                    }
                }
            }
        ]);
    }));
});
//# sourceMappingURL=FindReferencesProvider.test.js.map