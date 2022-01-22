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
const fs_1 = require("fs");
const documents_1 = require("../../../../src/lib/documents");
const utils_1 = require("../../../../src/utils");
const vscode_languageserver_1 = require("vscode-languageserver");
const CompletionProvider_1 = require("../../../../src/plugins/typescript/features/CompletionProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const lodash_1 = require("lodash");
const ls_config_1 = require("../../../../src/ls-config");
const testDir = path_1.join(__dirname, '..');
const testFilesDir = path_1.join(testDir, 'testfiles', 'completions');
const newLine = typescript_1.default.sys.newLine;
const fileNameToAbsoluteUri = (file) => {
    return utils_1.pathToUrl(path_1.join(testFilesDir, file));
};
describe('CompletionProviderImpl', () => {
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const filePath = path_1.join(testFilesDir, filename);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath) || ''
        });
        return { completionProvider, document, docManager };
    }
    it('provides completions', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('completions.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 49), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '.'
        });
        assert_1.default.ok(Array.isArray(completions && completions.items), 'Expected completion items to be an array');
        assert_1.default.ok(completions.items.length > 0, 'Expected completions to have length');
        const first = completions.items[0];
        delete first.data;
        assert_1.default.deepStrictEqual(first, {
            label: 'b',
            insertText: undefined,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            sortText: '11',
            commitCharacters: ['.', ',', '('],
            preselect: undefined,
            textEdit: undefined
        });
    }));
    it('provides completions on simple property access in mustache', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('mustache.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 3), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '.'
        });
        const first = completions.items[0];
        delete first.data;
        assert_1.default.deepStrictEqual(first, {
            label: 'b',
            insertText: undefined,
            kind: vscode_languageserver_1.CompletionItemKind.Field,
            sortText: '11',
            commitCharacters: ['.', ',', '('],
            preselect: undefined,
            textEdit: undefined
        });
    }));
    it('provides event completions', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 5), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        assert_1.default.ok(Array.isArray(completions && completions.items), 'Expected completion items to be an array');
        assert_1.default.ok(completions.items.length > 0, 'Expected completions to have length');
        const eventCompletions = completions.items.filter((item) => item.label.startsWith('on:'));
        assert_1.default.deepStrictEqual(eventCompletions, [
            {
                detail: 'aa: CustomEvent<boolean>',
                documentation: '',
                label: 'on:aa',
                sortText: '-1',
                textEdit: undefined
            },
            {
                detail: 'ab: MouseEvent',
                documentation: {
                    kind: 'markdown',
                    value: 'TEST'
                },
                label: 'on:ab',
                sortText: '-1',
                textEdit: undefined
            },
            {
                detail: 'ac: any',
                documentation: '',
                label: 'on:ac',
                sortText: '-1',
                textEdit: undefined
            }
        ]);
    }));
    it('provides event completions with correct text replacement span', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 11), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        assert_1.default.ok(Array.isArray(completions && completions.items), 'Expected completion items to be an array');
        assert_1.default.ok(completions.items.length > 0, 'Expected completions to have length');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const eventCompletions = completions.items.filter((item) => item.label.startsWith('on:'));
        assert_1.default.deepStrictEqual(eventCompletions, [
            {
                detail: 'aa: CustomEvent<boolean>',
                documentation: '',
                label: 'on:aa',
                sortText: '-1',
                textEdit: {
                    newText: 'on:aa',
                    range: {
                        start: {
                            line: 5,
                            character: 7
                        },
                        end: {
                            line: 5,
                            character: 11
                        }
                    }
                }
            },
            {
                detail: 'ab: MouseEvent',
                documentation: {
                    kind: 'markdown',
                    value: 'TEST'
                },
                label: 'on:ab',
                sortText: '-1',
                textEdit: {
                    newText: 'on:ab',
                    range: {
                        start: {
                            line: 5,
                            character: 7
                        },
                        end: {
                            line: 5,
                            character: 11
                        }
                    }
                }
            },
            {
                detail: 'ac: any',
                documentation: '',
                label: 'on:ac',
                sortText: '-1',
                textEdit: {
                    newText: 'on:ac',
                    range: {
                        start: {
                            line: 5,
                            character: 7
                        },
                        end: {
                            line: 5,
                            character: 11
                        }
                    }
                }
            }
        ]);
    }));
    it('provides event completions from createEventDispatcher', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(6, 5), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const eventCompletions = completions.items.filter((item) => item.label.startsWith('on:'));
        assert_1.default.deepStrictEqual(eventCompletions, [
            {
                detail: 'c: CustomEvent<boolean>',
                documentation: {
                    kind: 'markdown',
                    value: 'abc'
                },
                label: 'on:c',
                sortText: '-1',
                textEdit: undefined
            }
        ]);
    }));
    it('provides event completion for components with type definition', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion-ts-def.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(4, 16), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const eventCompletions = completions.items.filter((item) => item.label.startsWith('on:'));
        assert_1.default.deepStrictEqual(eventCompletions, [
            {
                detail: 'event1: CustomEvent<null>',
                documentation: '',
                label: 'on:event1',
                sortText: '-1',
                textEdit: {
                    newText: 'on:event1',
                    range: {
                        end: {
                            character: 16,
                            line: 4
                        },
                        start: {
                            character: 14,
                            line: 4
                        }
                    }
                }
            },
            {
                detail: 'event2: CustomEvent<string>',
                documentation: {
                    kind: 'markdown',
                    value: 'documentation for event2'
                },
                label: 'on:event2',
                sortText: '-1',
                textEdit: {
                    newText: 'on:event2',
                    range: {
                        end: {
                            character: 16,
                            line: 4
                        },
                        start: {
                            character: 14,
                            line: 4
                        }
                    }
                }
            }
        ]);
    }));
    it('provides event completion for components with type definition having multiple declarations of the same event', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion-ts-def.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(6, 16), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const eventCompletions = completions.items.filter((item) => item.label.startsWith('on:'));
        assert_1.default.deepStrictEqual(eventCompletions, [
            {
                detail: 'event1: CustomEvent<string> | CustomEvent<number>',
                label: 'on:event1',
                sortText: '-1',
                documentation: '',
                textEdit: {
                    newText: 'on:event1',
                    range: {
                        end: {
                            character: 17,
                            line: 6
                        },
                        start: {
                            character: 15,
                            line: 6
                        }
                    }
                }
            }
        ]);
    }));
    it('does not provide completions inside style tag', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('completionsstyle.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(4, 1), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked,
            triggerCharacter: 'a'
        });
        assert_1.default.ok(completions === null, 'Expected completion to be null');
    }));
    it('provides completion resolve info', () => __awaiter(void 0, void 0, void 0, function* () {
        const filename = 'completions.svelte';
        const { completionProvider, document } = setup(filename);
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 49), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '.'
        });
        const { data } = completions.items[0];
        assert_1.default.deepStrictEqual(data, {
            data: undefined,
            hasAction: undefined,
            insertText: undefined,
            isPackageJsonImport: undefined,
            isImportStatementCompletion: undefined,
            isRecommended: undefined,
            isSnippet: undefined,
            kind: 'method',
            kindModifiers: '',
            name: 'b',
            position: {
                character: 49,
                line: 0
            },
            replacementSpan: undefined,
            sortText: '11',
            source: undefined,
            sourceDisplay: undefined,
            uri: fileNameToAbsoluteUri(filename)
        });
    }));
    it('resolve completion and provide documentation', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('../documentation.svelte');
        const { documentation, detail } = yield completionProvider.resolveCompletion(document, {
            label: 'foo',
            kind: 6,
            commitCharacters: ['.', ',', '('],
            data: {
                name: 'foo',
                kind: typescript_1.default.ScriptElementKind.alias,
                sortText: '0',
                uri: '',
                position: vscode_languageserver_1.Position.create(3, 7)
            }
        });
        assert_1.default.deepStrictEqual(detail, '(alias) function foo(): boolean\nimport foo');
        assert_1.default.deepStrictEqual(documentation, {
            value: 'bars\n\n*@author* — John',
            kind: vscode_languageserver_1.MarkupKind.Markdown
        });
    }));
    it('provides import completions for directory', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importcompletions.svelte');
        const mockDirName = 'foo';
        const mockDirPath = path_1.join(testFilesDir, mockDirName);
        fs_1.mkdirSync(mockDirPath);
        try {
            const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 27), {
                triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
                triggerCharacter: '/'
            });
            const mockedDirImportCompletion = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === mockDirName);
            assert_1.default.notEqual(mockedDirImportCompletion, undefined, "can't provide completions on directory");
            assert_1.default.equal(mockedDirImportCompletion === null || mockedDirImportCompletion === void 0 ? void 0 : mockedDirImportCompletion.kind, vscode_languageserver_1.CompletionItemKind.Folder);
        }
        finally {
            fs_1.rmdirSync(mockDirPath);
        }
    }));
    it('provides import completions in file with uppercase directory', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('UpperCase/dirCasing.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 22), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '/'
        });
        assert_1.default.equal(completions === null || completions === void 0 ? void 0 : completions.items[0].label, 'toImport.ts');
    }));
    it('provides import completions for supported files', () => __awaiter(void 0, void 0, void 0, function* () {
        const sourceFile = 'importcompletions.svelte';
        const { completionProvider, document } = setup(sourceFile);
        const supportedExtensions = [
            typescript_1.default.Extension.Js,
            typescript_1.default.Extension.Ts,
            typescript_1.default.Extension.Dts,
            typescript_1.default.Extension.Jsx,
            typescript_1.default.Extension.Tsx,
            typescript_1.default.Extension.Json,
            '.svelte'
        ];
        const ignores = ['tsconfig.json', sourceFile];
        const testfiles = fs_1.readdirSync(testFilesDir, { withFileTypes: true })
            .filter((f) => f.isDirectory() ||
            (supportedExtensions.includes(path_1.extname(f.name)) && !ignores.includes(f.name)))
            .map((f) => f.name);
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 27), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '/'
        });
        assert_1.default.deepStrictEqual(lodash_1.sortBy(completions === null || completions === void 0 ? void 0 : completions.items.map((item) => item.label), (x) => x), lodash_1.sortBy(testfiles, (x) => x));
    }));
    it('resolve auto import completion (is first import in file)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const { completionProvider, document } = setup('importcompletions1.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 3));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from ../definitions\nfunction blubb(): boolean');
        assert_1.default.strictEqual(harmonizeNewLines((_a = additionalTextEdits[0]) === null || _a === void 0 ? void 0 : _a.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `${newLine}import { blubb } from "../definitions";${newLine}${newLine}`);
        assert_1.default.deepEqual((_b = additionalTextEdits[0]) === null || _b === void 0 ? void 0 : _b.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 8), vscode_languageserver_1.Position.create(0, 8)));
    }));
    it('resolve auto import completion (is second import in file)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d;
        const { completionProvider, document } = setup('importcompletions2.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(2, 3));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from ../definitions\nfunction blubb(): boolean');
        assert_1.default.strictEqual(harmonizeNewLines((_c = additionalTextEdits[0]) === null || _c === void 0 ? void 0 : _c.newText), `import { blubb } from '../definitions';${newLine}`);
        assert_1.default.deepEqual((_d = additionalTextEdits[0]) === null || _d === void 0 ? void 0 : _d.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(2, 0), vscode_languageserver_1.Position.create(2, 0)));
    }));
    it('resolve auto import completion (importing in same line as first import)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _e, _f;
        const { completionProvider, document } = setup('importcompletions3.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 42));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from ../definitions\nfunction blubb(): boolean');
        assert_1.default.strictEqual(harmonizeNewLines((_e = additionalTextEdits[0]) === null || _e === void 0 ? void 0 : _e.newText), `${newLine}import { blubb } from '../definitions';${newLine}`);
        assert_1.default.deepEqual((_f = additionalTextEdits[0]) === null || _f === void 0 ? void 0 : _f.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 8), vscode_languageserver_1.Position.create(0, 8)));
    }));
    it('resolve auto import completion (is second import, module-script present)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _g, _h;
        const { completionProvider, document } = setup('importcompletions7.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(7, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'onMount');
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from svelte\nfunction onMount(fn: () => any): void');
        assert_1.default.strictEqual(harmonizeNewLines((_g = additionalTextEdits[0]) === null || _g === void 0 ? void 0 : _g.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `${newLine}import { onMount } from "svelte";${newLine}`);
        assert_1.default.deepEqual((_h = additionalTextEdits[0]) === null || _h === void 0 ? void 0 : _h.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(4, 8), vscode_languageserver_1.Position.create(4, 8)));
    }));
    it('resolve auto import completion in instance script (instance and module script present)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _j, _k;
        const { completionProvider, document } = setup('importcompletions9.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'onMount');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(harmonizeNewLines((_j = additionalTextEdits[0]) === null || _j === void 0 ? void 0 : _j.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `${newLine}import { onMount } from "svelte";${newLine}${newLine}`);
        assert_1.default.deepEqual((_k = additionalTextEdits[0]) === null || _k === void 0 ? void 0 : _k.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(4, 8), vscode_languageserver_1.Position.create(4, 8)));
    }));
    it('resolve auto import completion in module script (instance and module script present)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _l, _m;
        const { completionProvider, document } = setup('importcompletions9.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'onMount');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(harmonizeNewLines((_l = additionalTextEdits[0]) === null || _l === void 0 ? void 0 : _l.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `${newLine}import { onMount } from "svelte";${newLine}${newLine}`);
        assert_1.default.deepEqual((_m = additionalTextEdits[0]) === null || _m === void 0 ? void 0 : _m.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 25), vscode_languageserver_1.Position.create(0, 25)));
    }));
    function openFileToBeImported(docManager, completionProvider, name = 'imported-file.svelte') {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path_1.join(testFilesDir, name);
            const hoverinfoDoc = docManager.openDocument({
                uri: utils_1.pathToUrl(filePath),
                text: typescript_1.default.sys.readFile(filePath) || ''
            });
            yield completionProvider.getCompletions(hoverinfoDoc, vscode_languageserver_1.Position.create(1, 1));
        });
    }
    it('resolve auto import completion (importing a svelte component)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _o, _p;
        const { completionProvider, document, docManager } = setup('importcompletions4.svelte');
        // make sure that the ts language service does know about the imported-file file
        yield openFileToBeImported(docManager, completionProvider);
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(2, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'ImportedFile');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from ../imported-file.svelte\nclass ImportedFile');
        assert_1.default.strictEqual(harmonizeNewLines((_o = additionalTextEdits[0]) === null || _o === void 0 ? void 0 : _o.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `${newLine}import ImportedFile from "../imported-file.svelte";${newLine}`);
        assert_1.default.deepEqual((_p = additionalTextEdits[0]) === null || _p === void 0 ? void 0 : _p.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 8), vscode_languageserver_1.Position.create(0, 8)));
    }));
    it('resolve auto import completion (importing a svelte component, no script tag yet)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _q, _r;
        const { completionProvider, document, docManager } = setup('importcompletions5.svelte');
        // make sure that the ts language service does know about the imported-file file
        yield openFileToBeImported(docManager, completionProvider);
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(0, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'ImportedFile');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits, detail } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(detail, 'Auto import from ../imported-file.svelte\nclass ImportedFile');
        assert_1.default.strictEqual(harmonizeNewLines((_q = additionalTextEdits[0]) === null || _q === void 0 ? void 0 : _q.newText), 
        // " instead of ' because VSCode uses " by default when there are no other imports indicating otherwise
        `<script>${newLine}import ImportedFile from "../imported-file.svelte";` +
            `${newLine}${newLine}</script>${newLine}`);
        assert_1.default.deepEqual((_r = additionalTextEdits[0]) === null || _r === void 0 ? void 0 : _r.range, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(0, 0)));
    }));
    it('resolve auto completion without auto import (a svelte component which was already imported)', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document, docManager } = setup('importcompletions6.svelte');
        // make sure that the ts language service does know about the imported-file file
        yield openFileToBeImported(docManager, completionProvider);
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(3, 7));
        document.version++;
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'ImportedFile');
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits, undefined);
    }));
    it('doesnt suggest svelte auto import when already other import with same name present', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document, docManager } = setup('importcompletions-2nd-import.svelte');
        // make sure that the ts language service does know about the imported-file file
        yield openFileToBeImported(docManager, completionProvider, 'ScndImport.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(2, 13));
        document.version++;
        const items = completions === null || completions === void 0 ? void 0 : completions.items.filter((item) => item.label === 'ScndImport');
        assert_1.default.equal(items === null || items === void 0 ? void 0 : items.length, 1);
        const item = items === null || items === void 0 ? void 0 : items[0];
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.additionalTextEdits, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.detail, undefined);
        assert_1.default.equal(item === null || item === void 0 ? void 0 : item.kind, vscode_languageserver_1.CompletionItemKind.Variable);
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits, undefined);
    }));
    it('resolve auto completion in correct place when already imported in module script', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importcompletions8.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 8));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.deepStrictEqual(additionalTextEdits, [
            {
                newText: '{ blubb }',
                range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 11), vscode_languageserver_1.Position.create(1, 14))
            }
        ]);
    }));
    it('can be canceled before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importcompletions1.svelte');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const completionsPromise = completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 3), undefined, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert_1.default.deepStrictEqual(yield completionsPromise, null);
    }));
    it('can cancel completion resolving before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importcompletions1.svelte');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 3));
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        const completionResolvingPromise = completionProvider.resolveCompletion(document, item, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert_1.default.deepStrictEqual((yield completionResolvingPromise).additionalTextEdits, undefined);
    }));
    const testForJsDocTemplateCompletion = (position, newText) => __awaiter(void 0, void 0, void 0, function* () {
        var _s, _t, _u;
        const { completionProvider, document } = setup('jsdoc-completions.svelte');
        const completions = yield completionProvider.getCompletions(document, position, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '*'
        });
        const item = (_s = completions === null || completions === void 0 ? void 0 : completions.items) === null || _s === void 0 ? void 0 : _s[0];
        const { line, character } = position;
        const start = vscode_languageserver_1.Position.create(line, character - '/**'.length);
        const end = vscode_languageserver_1.Position.create(line, character + '*/'.length);
        assert_1.default.strictEqual(harmonizeNewLines((_t = item === null || item === void 0 ? void 0 : item.textEdit) === null || _t === void 0 ? void 0 : _t.newText), newText);
        assert_1.default.deepStrictEqual((_u = item === null || item === void 0 ? void 0 : item.textEdit) === null || _u === void 0 ? void 0 : _u.range, vscode_languageserver_1.Range.create(start, end));
    });
    it('show jsDoc template completion', () => __awaiter(void 0, void 0, void 0, function* () {
        yield testForJsDocTemplateCompletion(vscode_languageserver_1.Position.create(1, 7), `/**${newLine} * $0${newLine} */`);
    }));
    it('show jsDoc template completion on function', () => __awaiter(void 0, void 0, void 0, function* () {
        yield testForJsDocTemplateCompletion(vscode_languageserver_1.Position.create(4, 7), `/**${newLine} * $0${newLine} * @param parameter1${newLine} */`);
    }));
    it('shows completions in reactive statement', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('completions-in-reactive-statement.svelte');
        yield checkCompletion(vscode_languageserver_1.Position.create(9, 13));
        yield checkCompletion(vscode_languageserver_1.Position.create(10, 16));
        yield checkCompletion(vscode_languageserver_1.Position.create(11, 14));
        yield checkCompletion(vscode_languageserver_1.Position.create(13, 17));
        yield checkCompletion(vscode_languageserver_1.Position.create(14, 20));
        yield checkCompletion(vscode_languageserver_1.Position.create(15, 18));
        function checkCompletion(position) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const completions = yield completionProvider.getCompletions(document, position, {
                    triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
                });
                assert_1.default.strictEqual(completions === null || completions === void 0 ? void 0 : completions.items.length, 1);
                const item = (_a = completions === null || completions === void 0 ? void 0 : completions.items) === null || _a === void 0 ? void 0 : _a[0];
                assert_1.default.strictEqual(item === null || item === void 0 ? void 0 : item.label, 'abc');
            });
        }
    })).timeout(4000);
    it('provides default slot-let completion for components with type definition', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('component-events-completion-ts-def.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(5, 17), {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const slotLetCompletions = completions.items.filter((item) => item.label.startsWith('let:'));
        assert_1.default.deepStrictEqual(slotLetCompletions, [
            {
                detail: 'let1: boolean',
                documentation: '',
                label: 'let:let1',
                sortText: '-1',
                textEdit: {
                    newText: 'let:let1',
                    range: {
                        end: {
                            character: 17,
                            line: 5
                        },
                        start: {
                            character: 14,
                            line: 5
                        }
                    }
                }
            },
            {
                detail: 'let2: string',
                documentation: {
                    kind: 'markdown',
                    value: 'documentation for let2'
                },
                label: 'let:let2',
                sortText: '-1',
                textEdit: {
                    newText: 'let:let2',
                    range: {
                        end: {
                            character: 17,
                            line: 5
                        },
                        start: {
                            character: 14,
                            line: 5
                        }
                    }
                }
            }
        ]);
    }));
    it('provides import statement completion', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importstatementcompletions.svelte');
        const completions = yield completionProvider.getCompletions(document, {
            line: 1,
            character: 14
        }, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'blubb');
        item === null || item === void 0 ? true : delete item.data;
        assert_1.default.deepStrictEqual(item, {
            additionalTextEdits: [
                {
                    newText: 'import ',
                    range: {
                        end: {
                            character: 11,
                            line: 1
                        },
                        start: {
                            character: 4,
                            line: 1
                        }
                    }
                }
            ],
            label: 'blubb',
            insertText: 'import { blubb } from "../definitions";',
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            sortText: '11',
            commitCharacters: ['.', ',', '('],
            preselect: undefined,
            textEdit: {
                newText: '{ blubb } from "../definitions";',
                range: {
                    end: {
                        character: 15,
                        line: 1
                    },
                    start: {
                        character: 11,
                        line: 1
                    }
                }
            }
        });
    }));
    it('provides optional chaining completion', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('completions-auto-optional-chain.svelte');
        const completions = yield completionProvider.getCompletions(document, {
            line: 3,
            character: 6
        }, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === 'toString');
        item === null || item === void 0 ? true : delete item.data;
        assert_1.default.deepStrictEqual(item, {
            additionalTextEdits: [
                {
                    newText: '?',
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
                }
            ],
            label: 'toString',
            insertText: '?.toString',
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            sortText: '11',
            commitCharacters: ['.', ',', '('],
            preselect: undefined,
            textEdit: {
                newText: '.toString',
                range: {
                    end: {
                        character: 6,
                        line: 3
                    },
                    start: {
                        character: 6,
                        line: 3
                    }
                }
            }
        });
    }));
    it('provide replacement for string completions', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('string-completion.svelte');
        const completions = yield completionProvider.getCompletions(document, {
            line: 1,
            character: 10
        }, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked
        });
        const item = completions === null || completions === void 0 ? void 0 : completions.items.find((item) => item.label === '@hi');
        item === null || item === void 0 ? true : delete item.data;
        assert_1.default.deepStrictEqual(item, {
            label: '@hi',
            kind: vscode_languageserver_1.CompletionItemKind.Constant,
            sortText: '11',
            preselect: undefined,
            insertText: undefined,
            commitCharacters: undefined,
            textEdit: {
                newText: '@hi',
                range: {
                    end: {
                        character: 10,
                        line: 1
                    },
                    start: {
                        character: 9,
                        line: 1
                    }
                }
            }
        });
    }));
    it('auto import with system new line', () => __awaiter(void 0, void 0, void 0, function* () {
        const { completionProvider, document } = setup('importcompletions-new-line.svelte');
        const completions = yield completionProvider.getCompletions(document, vscode_languageserver_1.Position.create(1, 7));
        const items = completions === null || completions === void 0 ? void 0 : completions.items.filter((item) => item.label === 'ScndImport');
        const item = items === null || items === void 0 ? void 0 : items[0];
        const { additionalTextEdits } = yield completionProvider.resolveCompletion(document, item);
        assert_1.default.strictEqual(additionalTextEdits === null || additionalTextEdits === void 0 ? void 0 : additionalTextEdits[0].newText, `${newLine}import { ScndImport } from "./to-import";${newLine}${newLine}`);
    }));
});
function harmonizeNewLines(input) {
    return input === null || input === void 0 ? void 0 : input.replace(/\r\n/g, '~:~').replace(/\n/g, '~:~').replace(/~:~/g, typescript_1.default.sys.newLine);
}
//# sourceMappingURL=CompletionProvider.test.js.map