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
const RenameProvider_1 = require("../../../../src/plugins/typescript/features/RenameProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path.join(__dirname, '..');
describe('RenameProvider', () => {
    function getFullPath(filename) {
        return path.join(testDir, 'testfiles', 'rename', filename);
    }
    function getUri(filename) {
        return utils_1.pathToUrl(getFullPath(filename));
    }
    function setup() {
        return __awaiter(this, void 0, void 0, function* () {
            const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
            const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
            const provider = new RenameProvider_1.RenameProviderImpl(lsAndTsDocResolver);
            const renameDoc1 = yield openDoc('rename.svelte');
            const renameDoc2 = yield openDoc('rename2.svelte');
            const renameDoc3 = yield openDoc('rename3.svelte');
            const renameDoc4 = yield openDoc('rename4.svelte');
            const renameDoc5 = yield openDoc('rename5.svelte');
            const renameDoc6 = yield openDoc('rename6.svelte');
            const renameDocIgnoreGenerated = yield openDoc('rename-ignore-generated.svelte');
            const renameDocSlotEventsImporter = yield openDoc('rename-slot-events-importer.svelte');
            const renameDocPropWithSlotEvents = yield openDoc('rename-prop-with-slot-events.svelte');
            const renameDocShorthand = yield openDoc('rename-shorthand.svelte');
            const renameSlotLet = yield openDoc('rename-slot-let.svelte');
            return {
                provider,
                renameDoc1,
                renameDoc2,
                renameDoc3,
                renameDoc4,
                renameDoc5,
                renameDoc6,
                renameDocIgnoreGenerated,
                renameDocSlotEventsImporter,
                renameDocPropWithSlotEvents,
                renameDocShorthand,
                renameSlotLet,
                docManager
            };
            function openDoc(filename) {
                return __awaiter(this, void 0, void 0, function* () {
                    const filePath = getFullPath(filename);
                    const doc = docManager.openDocument({
                        uri: utils_1.pathToUrl(filePath),
                        text: typescript_1.default.sys.readFile(filePath) || ''
                    });
                    // Do this to make the file known to the ts language service
                    yield provider.rename(doc, vscode_languageserver_1.Position.create(0, 0), '');
                    return doc;
                });
            }
        });
    }
    it('should rename variable that is scoped to component only', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc1 } = yield setup();
        const result = yield provider.rename(renameDoc1, vscode_languageserver_1.Position.create(2, 15), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 8,
                                line: 2
                            },
                            end: {
                                character: 17,
                                line: 2
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 1,
                                line: 5
                            },
                            end: {
                                character: 10,
                                line: 5
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 5,
                                line: 6
                            },
                            end: {
                                character: 14,
                                line: 6
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 8,
                                line: 8
                            },
                            end: {
                                character: 17,
                                line: 8
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 7,
                                line: 10
                            },
                            end: {
                                character: 16,
                                line: 10
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 15,
                                line: 12
                            },
                            end: {
                                character: 24,
                                line: 12
                            }
                        }
                    }
                ]
            }
        });
    }));
    const expectedEditsForPropRename = {
        changes: {
            [getUri('rename.svelte')]: [
                {
                    newText: 'newName',
                    range: {
                        start: {
                            character: 15,
                            line: 1
                        },
                        end: {
                            character: 27,
                            line: 1
                        }
                    }
                },
                {
                    newText: 'newName',
                    range: {
                        start: {
                            character: 1,
                            line: 14
                        },
                        end: {
                            character: 13,
                            line: 14
                        }
                    }
                }
            ],
            [getUri('rename2.svelte')]: [
                {
                    newText: 'newName',
                    range: {
                        start: {
                            character: 8,
                            line: 5
                        },
                        end: {
                            character: 20,
                            line: 5
                        }
                    }
                }
            ]
        }
    };
    it('should do rename of prop of component A in component A', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc1 } = yield setup();
        const result = yield provider.rename(renameDoc1, vscode_languageserver_1.Position.create(1, 25), 'newName');
        assert.deepStrictEqual(result, expectedEditsForPropRename);
    }));
    it('should do rename of prop of component A in component B', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc2 } = yield setup();
        const result = yield provider.rename(renameDoc2, vscode_languageserver_1.Position.create(5, 10), 'newName');
        assert.deepStrictEqual(result, expectedEditsForPropRename);
    }));
    it('should not allow rename of intrinsic attribute', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc2 } = yield setup();
        const prepareResult = yield provider.prepareRename(renameDoc2, vscode_languageserver_1.Position.create(7, 7));
        const renameResult = yield provider.rename(renameDoc2, vscode_languageserver_1.Position.create(7, 7), 'newName');
        assert.deepStrictEqual(prepareResult, null);
        assert.deepStrictEqual(renameResult, null);
    }));
    it('should do rename of prop without type of component A in component A', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc3 } = yield setup();
        const result = yield provider.rename(renameDoc3, vscode_languageserver_1.Position.create(1, 25), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename3.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 15,
                                line: 1
                            },
                            end: {
                                character: 33,
                                line: 1
                            }
                        }
                    }
                ],
                [getUri('rename2.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 9,
                                line: 6
                            },
                            end: {
                                character: 27,
                                line: 6
                            }
                        }
                    }
                ]
            }
        });
    }));
    it('should do rename of svelte component', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc4 } = yield setup();
        const result = yield provider.rename(renameDoc4, vscode_languageserver_1.Position.create(1, 12), 'ChildNew');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename4.svelte')]: [
                    {
                        newText: 'ChildNew',
                        range: {
                            start: {
                                line: 1,
                                character: 11
                            },
                            end: {
                                line: 1,
                                character: 16
                            }
                        }
                    },
                    {
                        newText: 'ChildNew',
                        range: {
                            start: {
                                line: 7,
                                character: 5
                            },
                            end: {
                                line: 7,
                                character: 10
                            }
                        }
                    },
                    {
                        newText: 'ChildNew',
                        range: {
                            start: {
                                line: 8,
                                character: 5
                            },
                            end: {
                                line: 8,
                                character: 10
                            }
                        }
                    }
                ]
            }
        });
    }));
    describe('should allow rename of $store', () => {
        function do$storeRename(pos) {
            return __awaiter(this, void 0, void 0, function* () {
                const { provider, renameDoc5 } = yield setup();
                const result = yield provider.rename(renameDoc5, pos, 'store1');
                assert.deepStrictEqual(result, {
                    changes: {
                        [getUri('rename5.svelte')]: [
                            {
                                newText: 'store1',
                                range: {
                                    start: {
                                        line: 1,
                                        character: 8
                                    },
                                    end: {
                                        line: 1,
                                        character: 13
                                    }
                                }
                            },
                            {
                                newText: 'store1',
                                range: {
                                    start: {
                                        line: 2,
                                        character: 5
                                    },
                                    end: {
                                        line: 2,
                                        character: 10
                                    }
                                }
                            },
                            {
                                newText: 'store1',
                                range: {
                                    start: {
                                        line: 3,
                                        character: 8
                                    },
                                    end: {
                                        line: 3,
                                        character: 13
                                    }
                                }
                            },
                            {
                                newText: 'store1',
                                range: {
                                    start: {
                                        line: 6,
                                        character: 2
                                    },
                                    end: {
                                        line: 6,
                                        character: 7
                                    }
                                }
                            },
                            {
                                newText: 'store1',
                                range: {
                                    start: {
                                        line: 7,
                                        character: 6
                                    },
                                    end: {
                                        line: 7,
                                        character: 11
                                    }
                                }
                            }
                        ]
                    }
                });
            });
        }
        it('from definition', () => __awaiter(void 0, void 0, void 0, function* () {
            yield do$storeRename(vscode_languageserver_1.Position.create(1, 10));
        }));
        it('from usage within script', () => __awaiter(void 0, void 0, void 0, function* () {
            yield do$storeRename(vscode_languageserver_1.Position.create(3, 10));
        }));
    });
    it('should allow rename of variable', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc1 } = yield setup();
        const result = yield provider.prepareRename(renameDoc1, vscode_languageserver_1.Position.create(1, 25));
        assert.deepStrictEqual(result, {
            start: {
                character: 15,
                line: 1
            },
            end: {
                character: 27,
                line: 1
            }
        });
    }));
    it('should not allow rename of html element', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc1 } = yield setup();
        const result = yield provider.prepareRename(renameDoc1, vscode_languageserver_1.Position.create(12, 1));
        assert.deepStrictEqual(result, null);
    }));
    it('should not allow rename of html attribute', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc1 } = yield setup();
        const result = yield provider.prepareRename(renameDoc1, vscode_languageserver_1.Position.create(12, 5));
        assert.deepStrictEqual(result, null);
    }));
    it('should rename with prefix', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDoc6 } = yield setup();
        const result = yield provider.rename(renameDoc6, vscode_languageserver_1.Position.create(3, 9), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename6.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                character: 8,
                                line: 3
                            },
                            end: {
                                character: 11,
                                line: 3
                            }
                        }
                    },
                    {
                        newText: 'foo: newName',
                        range: {
                            start: {
                                character: 16,
                                line: 4
                            },
                            end: {
                                character: 19,
                                line: 4
                            }
                        }
                    },
                    {
                        newText: 'foo: newName',
                        range: {
                            start: {
                                character: 18,
                                line: 7
                            },
                            end: {
                                character: 21,
                                line: 7
                            }
                        }
                    }
                ]
            }
        });
    }));
    it('should rename and ignore generated', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDocIgnoreGenerated } = yield setup();
        const result = yield provider.rename(renameDocIgnoreGenerated, vscode_languageserver_1.Position.create(1, 8), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename-ignore-generated.svelte')]: [
                    {
                        newText: 'newName',
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
                    },
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 6,
                                line: 5
                            },
                            start: {
                                character: 5,
                                line: 5
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 21,
                                line: 7
                            },
                            start: {
                                character: 20,
                                line: 7
                            }
                        }
                    }
                ]
            }
        });
    }));
    it('rename prop correctly when events/slots present', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDocPropWithSlotEvents } = yield setup();
        const result = yield provider.rename(renameDocPropWithSlotEvents, vscode_languageserver_1.Position.create(3, 15), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename-prop-with-slot-events.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 17,
                                line: 3
                            },
                            start: {
                                character: 13,
                                line: 3
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 17,
                                line: 8
                            },
                            start: {
                                character: 13,
                                line: 8
                            }
                        }
                    }
                ],
                [getUri('rename-slot-events-importer.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 7,
                                line: 4
                            },
                            start: {
                                character: 3,
                                line: 4
                            }
                        }
                    }
                ]
            }
        });
    }));
    it('can rename shorthand props without breaking value-passing', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameDocShorthand } = yield setup();
        const result = yield provider.rename(renameDocShorthand, vscode_languageserver_1.Position.create(3, 16), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename-shorthand.svelte')]: [
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                line: 3,
                                character: 15
                            },
                            end: {
                                line: 3,
                                character: 21
                            }
                        }
                    },
                    {
                        newText: 'bind:props2={newName}',
                        range: {
                            start: {
                                line: 6,
                                character: 7
                            },
                            end: {
                                line: 6,
                                character: 18
                            }
                        }
                    },
                    {
                        newText: 'props2={newName}',
                        range: {
                            start: {
                                line: 7,
                                character: 7
                            },
                            end: {
                                line: 7,
                                character: 15
                            }
                        }
                    },
                    {
                        newText: 'props2={newName}',
                        range: {
                            start: {
                                line: 8,
                                character: 7
                            },
                            end: {
                                line: 8,
                                character: 22
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            start: {
                                line: 9,
                                character: 15
                            },
                            end: {
                                line: 9,
                                character: 21
                            }
                        }
                    }
                ]
            }
        });
    }));
    it('can rename slot let to an alias', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, renameSlotLet } = yield setup();
        const result = yield provider.rename(renameSlotLet, vscode_languageserver_1.Position.create(4, 7), 'newName');
        assert.deepStrictEqual(result, {
            changes: {
                [getUri('rename-slot-let.svelte')]: [
                    {
                        newText: 'aSlot={newName}',
                        range: {
                            end: {
                                character: 12,
                                line: 4
                            },
                            start: {
                                character: 7,
                                line: 4
                            }
                        }
                    },
                    {
                        newText: 'newName',
                        range: {
                            end: {
                                character: 26,
                                line: 4
                            },
                            start: {
                                character: 21,
                                line: 4
                            }
                        }
                    }
                ]
            }
        });
    }));
});
//# sourceMappingURL=RenameProvider.test.js.map