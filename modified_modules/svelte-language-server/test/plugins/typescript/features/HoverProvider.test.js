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
const HoverProvider_1 = require("../../../../src/plugins/typescript/features/HoverProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path.join(__dirname, '..');
describe('HoverProvider', () => {
    function getFullPath(filename) {
        return path.join(testDir, 'testfiles', 'hover', filename);
    }
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [testDir], new ls_config_1.LSConfigManager());
        const provider = new HoverProvider_1.HoverProviderImpl(lsAndTsDocResolver);
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
    it('provides basic hover info when no docstring exists', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('hoverinfo.svelte');
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(6, 10)), {
            contents: '```typescript\nconst withoutDocs: true\n```',
            range: {
                start: {
                    character: 10,
                    line: 6
                },
                end: {
                    character: 21,
                    line: 6
                }
            }
        });
    }));
    it('provides formatted hover info when a docstring exists', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('hoverinfo.svelte');
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(4, 10)), {
            contents: '```typescript\nconst withDocs: true\n```\n---\nDocumentation string',
            range: {
                start: {
                    character: 10,
                    line: 4
                },
                end: {
                    character: 18,
                    line: 4
                }
            }
        });
    }));
    it('provides formatted hover info for component events', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('hoverinfo.svelte');
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(12, 26)), {
            contents: '```typescript\nabc: MouseEvent\n```\nTEST\n```ts\nconst abc: boolean = true;\n```'
        });
    }));
    it('provides formatted hover info for jsDoc tags', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('hoverinfo.svelte');
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(9, 10)), {
            contents: '```typescript\nconst withJsDocTag: true\n```\n---\n\n\n*@author* — foo ',
            range: {
                start: {
                    character: 10,
                    line: 9
                },
                end: {
                    character: 22,
                    line: 9
                }
            }
        });
    }));
    it('provides hover info for $store access', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('hover-$store.svelte');
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(3, 5)), {
            contents: '```typescript\nlet $b: string | {\n    a: boolean | string;\n}\n```',
            range: {
                end: {
                    character: 6,
                    line: 3
                },
                start: {
                    character: 5,
                    line: 3
                }
            }
        });
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(5, 9)), {
            contents: '```typescript\nlet $b: string\n```',
            range: {
                end: {
                    character: 10,
                    line: 5
                },
                start: {
                    character: 9,
                    line: 5
                }
            }
        });
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(7, 4)), {
            contents: '```typescript\nconst b: Writable<string | {\n    a: boolean | string;\n}>\n```',
            range: {
                end: {
                    character: 5,
                    line: 7
                },
                start: {
                    character: 4,
                    line: 7
                }
            }
        });
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(10, 2)), {
            contents: '```typescript\nlet $b: string | {\n    a: boolean | string;\n}\n```',
            range: {
                end: {
                    character: 3,
                    line: 10
                },
                start: {
                    character: 2,
                    line: 10
                }
            }
        });
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(12, 6)), {
            contents: '```typescript\nlet $b: string\n```',
            range: {
                end: {
                    character: 7,
                    line: 12
                },
                start: {
                    character: 6,
                    line: 12
                }
            }
        });
        assert.deepStrictEqual(yield provider.doHover(document, vscode_languageserver_1.Position.create(14, 1)), {
            contents: '```typescript\nconst b: Writable<string | {\n    a: boolean | string;\n}>\n```',
            range: {
                end: {
                    character: 2,
                    line: 14
                },
                start: {
                    character: 1,
                    line: 14
                }
            }
        });
    }));
});
//# sourceMappingURL=HoverProvider.test.js.map