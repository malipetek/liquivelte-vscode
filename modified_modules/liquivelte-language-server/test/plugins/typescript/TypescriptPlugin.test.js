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
const fs_1 = require("fs");
const path = require("path");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../src/lib/documents");
const ls_config_1 = require("../../../src/ls-config");
const plugins_1 = require("../../../src/plugins");
const DocumentSnapshot_1 = require("../../../src/plugins/typescript/DocumentSnapshot");
const SnapshotManager_1 = require("../../../src/plugins/typescript/SnapshotManager");
const utils_1 = require("../../../src/utils");
describe('TypescriptPlugin', () => {
    function getUri(filename) {
        const filePath = path.join(__dirname, 'testfiles', filename);
        return utils_1.pathToUrl(filePath);
    }
    function harmonizeNewLines(input) {
        return input.replace(/\r\n/g, '~:~').replace(/\n/g, '~:~').replace(/~:~/g, '\n');
    }
    function setup(filename) {
        const docManager = new documents_1.DocumentManager(() => document);
        const testDir = path.join(__dirname, 'testfiles');
        const filePath = path.join(testDir, filename);
        const document = new documents_1.Document(utils_1.pathToUrl(filePath), typescript_1.default.sys.readFile(filePath) || '');
        const pluginManager = new ls_config_1.LSConfigManager();
        const plugin = new plugins_1.TypeScriptPlugin(pluginManager, new plugins_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], pluginManager));
        docManager.openDocument('some doc');
        return { plugin, document };
    }
    it('provides document symbols', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('documentsymbols.svelte');
        const symbols = yield plugin.getDocumentSymbols(document);
        assert.deepStrictEqual(symbols.map((s) => (Object.assign(Object.assign({}, s), { name: harmonizeNewLines(s.name) }))), [
            {
                containerName: 'render',
                kind: 12,
                location: {
                    range: {
                        start: {
                            line: 6,
                            character: 3
                        },
                        end: {
                            line: 8,
                            character: 5
                        }
                    },
                    uri: getUri('documentsymbols.svelte')
                },
                name: "$: if (hello) {\n        console.log('hi');\n    }"
            },
            {
                containerName: 'render',
                kind: 12,
                location: {
                    range: {
                        start: {
                            line: 1,
                            character: 4
                        },
                        end: {
                            line: 3,
                            character: 5
                        }
                    },
                    uri: getUri('documentsymbols.svelte')
                },
                name: 'bla'
            },
            {
                containerName: 'render',
                kind: 13,
                location: {
                    range: {
                        start: {
                            line: 5,
                            character: 7
                        },
                        end: {
                            line: 5,
                            character: 16
                        }
                    },
                    uri: getUri('documentsymbols.svelte')
                },
                name: 'hello'
            }
        ]);
    }));
    it('can cancel document symbols before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('documentsymbols.svelte');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const symbolsPromise = plugin.getDocumentSymbols(document, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert.deepStrictEqual(yield symbolsPromise, []);
    }));
    it('provides definitions within svelte doc', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('definitions.svelte');
        const definitions = yield plugin.getDefinitions(document, vscode_languageserver_1.Position.create(4, 1));
        assert.deepStrictEqual(definitions, [
            {
                originSelectionRange: {
                    start: {
                        character: 0,
                        line: 4
                    },
                    end: {
                        character: 3,
                        line: 4
                    }
                },
                targetRange: {
                    start: {
                        character: 9,
                        line: 3
                    },
                    end: {
                        character: 12,
                        line: 3
                    }
                },
                targetSelectionRange: {
                    start: {
                        character: 9,
                        line: 3
                    },
                    end: {
                        character: 12,
                        line: 3
                    }
                },
                targetUri: getUri('definitions.svelte')
            }
        ]);
    }));
    it('provides definitions from svelte to ts doc', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('definitions.svelte');
        const definitions = yield plugin.getDefinitions(document, vscode_languageserver_1.Position.create(5, 1));
        assert.deepStrictEqual(definitions, [
            {
                originSelectionRange: {
                    start: {
                        character: 0,
                        line: 5
                    },
                    end: {
                        character: 5,
                        line: 5
                    }
                },
                targetRange: {
                    start: {
                        character: 16,
                        line: 0
                    },
                    end: {
                        character: 21,
                        line: 0
                    }
                },
                targetSelectionRange: {
                    start: {
                        character: 16,
                        line: 0
                    },
                    end: {
                        character: 21,
                        line: 0
                    }
                },
                targetUri: getUri('definitions.ts')
            }
        ]);
    }));
    it('provides definitions from svelte to svelte doc', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('definitions.svelte');
        const definitions = yield plugin.getDefinitions(document, vscode_languageserver_1.Position.create(12, 3));
        assert.deepStrictEqual(definitions, [
            {
                originSelectionRange: {
                    start: {
                        character: 1,
                        line: 12
                    },
                    end: {
                        character: 13,
                        line: 12
                    }
                },
                targetRange: {
                    start: {
                        character: 1,
                        line: 0
                    },
                    end: {
                        character: 1,
                        line: 0
                    }
                },
                targetSelectionRange: {
                    start: {
                        character: 1,
                        line: 0
                    },
                    end: {
                        character: 1,
                        line: 0
                    }
                },
                targetUri: getUri('imported-file.svelte')
            }
        ]);
    }));
    describe('provides definitions for $store within svelte file', () => {
        function test$StoreDef(pos, originSelectionRange) {
            return __awaiter(this, void 0, void 0, function* () {
                const { plugin, document } = setup('definitions.svelte');
                const definitions = yield plugin.getDefinitions(document, pos);
                assert.deepStrictEqual(definitions, [
                    {
                        originSelectionRange,
                        targetRange: {
                            start: {
                                character: 4,
                                line: 6
                            },
                            end: {
                                character: 9,
                                line: 6
                            }
                        },
                        targetSelectionRange: {
                            start: {
                                character: 4,
                                line: 6
                            },
                            end: {
                                character: 9,
                                line: 6
                            }
                        },
                        targetUri: getUri('definitions.svelte')
                    }
                ]);
            });
        }
        it('(within script simple)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(7, 1), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(7, 1), vscode_languageserver_1.Position.create(7, 6)));
        }));
        it('(within script if)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(8, 7), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(8, 5), vscode_languageserver_1.Position.create(8, 10)));
        }));
        it('(within template simple)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(13, 3), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(13, 2), vscode_languageserver_1.Position.create(13, 7)));
        }));
        it('(within template if)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(14, 7), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(14, 6), vscode_languageserver_1.Position.create(14, 11)));
        }));
    });
    describe('provides definitions for $store from svelte file to ts file', () => {
        function test$StoreDef(pos, originSelectionRange) {
            return __awaiter(this, void 0, void 0, function* () {
                const { plugin, document } = setup('definitions.svelte');
                const definitions = yield plugin.getDefinitions(document, pos);
                assert.deepStrictEqual(definitions, [
                    {
                        originSelectionRange,
                        targetRange: {
                            start: {
                                character: 16,
                                line: 0
                            },
                            end: {
                                character: 21,
                                line: 0
                            }
                        },
                        targetSelectionRange: {
                            start: {
                                character: 16,
                                line: 0
                            },
                            end: {
                                character: 21,
                                line: 0
                            }
                        },
                        targetUri: getUri('definitions.ts')
                    }
                ]);
            });
        }
        it('(within script simple)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(9, 1), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(9, 1), vscode_languageserver_1.Position.create(9, 6)));
        }));
        it('(within script if)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(10, 7), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(10, 5), vscode_languageserver_1.Position.create(10, 10)));
        }));
        it('(within template simple)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(16, 3), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(16, 2), vscode_languageserver_1.Position.create(16, 7)));
        }));
        it('(within template if)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield test$StoreDef(vscode_languageserver_1.Position.create(17, 7), vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(17, 6), vscode_languageserver_1.Position.create(17, 11)));
        }));
    });
    const setupForOnWatchedFileChanges = () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('empty.svelte');
        const targetSvelteFile = document.getFilePath();
        const snapshotManager = yield plugin.getSnapshotManager(targetSvelteFile);
        return {
            snapshotManager,
            plugin,
            targetSvelteFile
        };
    });
    const setupForOnWatchedFileUpdateOrDelete = () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, snapshotManager, targetSvelteFile } = yield setupForOnWatchedFileChanges();
        const projectJsFile = path.join(path.dirname(targetSvelteFile), 'documentation.ts');
        yield plugin.onWatchFileChanges([
            {
                fileName: projectJsFile,
                changeType: vscode_languageserver_1.FileChangeType.Changed
            }
        ]);
        return {
            snapshotManager,
            plugin,
            projectJsFile
        };
    });
    it('bumps snapshot version when watched file changes', () => __awaiter(void 0, void 0, void 0, function* () {
        const { snapshotManager, projectJsFile, plugin } = yield setupForOnWatchedFileUpdateOrDelete();
        const firstSnapshot = snapshotManager.get(projectJsFile);
        const firstVersion = firstSnapshot === null || firstSnapshot === void 0 ? void 0 : firstSnapshot.version;
        assert.notEqual(firstVersion, DocumentSnapshot_1.INITIAL_VERSION);
        yield plugin.onWatchFileChanges([
            {
                fileName: projectJsFile,
                changeType: vscode_languageserver_1.FileChangeType.Changed
            }
        ]);
        const secondSnapshot = snapshotManager.get(projectJsFile);
        assert.notEqual(secondSnapshot === null || secondSnapshot === void 0 ? void 0 : secondSnapshot.version, firstVersion);
    }));
    it('should delete snapshot cache when file delete', () => __awaiter(void 0, void 0, void 0, function* () {
        const { snapshotManager, projectJsFile, plugin } = yield setupForOnWatchedFileUpdateOrDelete();
        const firstSnapshot = snapshotManager.get(projectJsFile);
        assert.notEqual(firstSnapshot, undefined);
        yield plugin.onWatchFileChanges([
            {
                fileName: projectJsFile,
                changeType: vscode_languageserver_1.FileChangeType.Deleted
            }
        ]);
        const secondSnapshot = snapshotManager.get(projectJsFile);
        assert.equal(secondSnapshot, undefined);
    }));
    const testForOnWatchedFileAdd = (filePath, shouldExist) => __awaiter(void 0, void 0, void 0, function* () {
        const { snapshotManager, plugin, targetSvelteFile } = yield setupForOnWatchedFileChanges();
        const addFile = path.join(path.dirname(targetSvelteFile), filePath);
        const dir = path.dirname(addFile);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir);
        }
        fs_1.default.writeFileSync(addFile, 'export function abc() {}');
        assert.ok(fs_1.default.existsSync(addFile));
        try {
            assert.equal(snapshotManager.has(addFile), false);
            yield plugin.onWatchFileChanges([
                {
                    fileName: addFile,
                    changeType: vscode_languageserver_1.FileChangeType.Created
                }
            ]);
            assert.equal(snapshotManager.has(addFile), shouldExist);
            yield plugin.onWatchFileChanges([
                {
                    fileName: addFile,
                    changeType: vscode_languageserver_1.FileChangeType.Changed
                }
            ]);
            assert.equal(snapshotManager.has(addFile), shouldExist);
        }
        finally {
            fs_1.default.unlinkSync(addFile);
        }
    });
    it('should add snapshot when a project file is added', () => __awaiter(void 0, void 0, void 0, function* () {
        yield testForOnWatchedFileAdd('foo.ts', true);
    }));
    it('should not add snapshot when an excluded file is added', () => __awaiter(void 0, void 0, void 0, function* () {
        yield testForOnWatchedFileAdd(path.join('dist', 'index.js'), false);
    }));
    it('should not add snapshot when files added to known build directory', () => __awaiter(void 0, void 0, void 0, function* () {
        for (const dir of SnapshotManager_1.ignoredBuildDirectories) {
            yield testForOnWatchedFileAdd(path.join(dir, 'index.js'), false);
        }
    }));
    it('should update ts/js file after document change', () => __awaiter(void 0, void 0, void 0, function* () {
        const { snapshotManager, projectJsFile, plugin } = yield setupForOnWatchedFileUpdateOrDelete();
        const firstSnapshot = snapshotManager.get(projectJsFile);
        const firstVersion = firstSnapshot === null || firstSnapshot === void 0 ? void 0 : firstSnapshot.version;
        const firstText = firstSnapshot === null || firstSnapshot === void 0 ? void 0 : firstSnapshot.getText(0, firstSnapshot === null || firstSnapshot === void 0 ? void 0 : firstSnapshot.getLength());
        assert.notEqual(firstVersion, DocumentSnapshot_1.INITIAL_VERSION);
        yield plugin.updateTsOrJsFile(projectJsFile, [
            {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                text: 'const = "hello world";'
            }
        ]);
        const secondSnapshot = snapshotManager.get(projectJsFile);
        assert.notEqual(secondSnapshot === null || secondSnapshot === void 0 ? void 0 : secondSnapshot.version, firstVersion);
        assert.equal(secondSnapshot === null || secondSnapshot === void 0 ? void 0 : secondSnapshot.getText(0, secondSnapshot === null || secondSnapshot === void 0 ? void 0 : secondSnapshot.getLength()), 'const = "hello world";' + firstText);
    }));
});
//# sourceMappingURL=TypescriptPlugin.test.js.map