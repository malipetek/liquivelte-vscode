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
const fs = require("fs");
const os_1 = require("os");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const getCodeActions_1 = require("../../../../src/plugins/svelte/features/getCodeActions");
const getRefactorings_1 = require("../../../../src/plugins/svelte/features/getCodeActions/getRefactorings");
const SvelteDocument_1 = require("../../../../src/plugins/svelte/SvelteDocument");
const utils_1 = require("../../../../src/utils");
describe('SveltePlugin#getCodeAction', () => {
    const testDir = path.join(__dirname, '..', 'testfiles');
    function getFullPath(filename) {
        return path.join(testDir, filename);
    }
    function getUri(filename) {
        return utils_1.pathToUrl(getFullPath(filename));
    }
    function expectCodeActionFor(filename, context) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(testDir, filename);
            const document = new documents_1.Document(utils_1.pathToUrl(filePath), filename ? (_a = fs.readFileSync(filePath)) === null || _a === void 0 ? void 0 : _a.toString() : '');
            const svelteDoc = new SvelteDocument_1.SvelteDocument(document);
            const codeAction = yield getCodeActions_1.getCodeActions(svelteDoc, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(0, 0)), context);
            return {
                toEqual: (expected) => assert.deepStrictEqual(codeAction, expected)
            };
        });
    }
    describe('It should not provide svelte ignore code actions', () => {
        const startRange = vscode_languageserver_1.Range.create({ line: 0, character: 0 }, { line: 0, character: 1 });
        it('if no svelte diagnostic', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor('', {
                diagnostics: [
                    {
                        code: 'whatever',
                        source: 'eslint',
                        range: startRange,
                        message: ''
                    }
                ]
            })).toEqual([]);
        }));
        it('if no diagnostic code', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor('', {
                diagnostics: [
                    {
                        source: 'svelte',
                        range: startRange,
                        message: ''
                    }
                ]
            })).toEqual([]);
        }));
        it('if diagnostic is error', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor('', {
                diagnostics: [
                    {
                        source: 'svelte',
                        range: startRange,
                        message: '',
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error
                    }
                ]
            })).toEqual([]);
        }));
    });
    describe('It should provide svelte ignore code actions ', () => {
        const svelteIgnoreCodeAction = 'svelte-ignore-code-action.svelte';
        it('should provide ignore comment', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-missing-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 0, character: 0 }, { line: 0, character: 6 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        // eslint-disable-next-line max-len
                                        newText: `<!-- svelte-ignore a11y-missing-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 0
                                            },
                                            start: {
                                                character: 0,
                                                line: 0
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-missing-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
        it('should provide ignore comment with indent', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-missing-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 3, character: 4 }, { line: 3, character: 11 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        newText: `${' '.repeat(4)}<!-- svelte-ignore a11y-missing-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 3
                                            },
                                            start: {
                                                character: 0,
                                                line: 3
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-missing-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
        it('should provide ignore comment with indent of parent tag', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-invalid-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 6, character: 8 }, { line: 6, character: 15 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        newText: `${' '.repeat(4)}<!-- svelte-ignore a11y-invalid-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 5
                                            },
                                            start: {
                                                character: 0,
                                                line: 5
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-invalid-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
    });
    describe('It should provide svelte ignore code actions (TypeScript)', () => {
        const svelteIgnoreCodeAction = 'svelte-ignore-code-action-ts.svelte';
        it('should provide ignore comment', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-missing-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 7, character: 0 }, { line: 7, character: 6 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        // eslint-disable-next-line max-len
                                        newText: `<!-- svelte-ignore a11y-missing-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 7
                                            },
                                            start: {
                                                character: 0,
                                                line: 7
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-missing-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
        it('should provide ignore comment with indent', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-missing-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 10, character: 4 }, { line: 10, character: 11 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        newText: `${' '.repeat(4)}<!-- svelte-ignore a11y-missing-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 10
                                            },
                                            start: {
                                                character: 0,
                                                line: 10
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-missing-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
        it('should provide ignore comment with indent of parent tag', () => __awaiter(void 0, void 0, void 0, function* () {
            (yield expectCodeActionFor(svelteIgnoreCodeAction, {
                diagnostics: [
                    {
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        code: 'a11y-invalid-attribute',
                        range: vscode_languageserver_1.Range.create({ line: 13, character: 8 }, { line: 13, character: 15 }),
                        message: '',
                        source: 'svelte'
                    }
                ]
            })).toEqual([
                {
                    edit: {
                        documentChanges: [
                            {
                                edits: [
                                    {
                                        newText: `${' '.repeat(4)}<!-- svelte-ignore a11y-invalid-attribute -->${os_1.EOL}`,
                                        range: {
                                            end: {
                                                character: 0,
                                                line: 12
                                            },
                                            start: {
                                                character: 0,
                                                line: 12
                                            }
                                        }
                                    }
                                ],
                                textDocument: {
                                    uri: getUri(svelteIgnoreCodeAction),
                                    version: null
                                }
                            }
                        ]
                    },
                    title: '(svelte) Disable a11y-invalid-attribute for this line',
                    kind: 'quickfix'
                }
            ]);
        }));
    });
    describe('#extractComponent', () => __awaiter(void 0, void 0, void 0, function* () {
        const scriptContent = `<script>
        const bla = true;
        </script>`;
        const styleContent = '<style>p{color: blue}</style>';
        const content = `
        ${scriptContent}
        <p>something else</p>
        <p>extract me</p>
        ${styleContent}`;
        const doc = new SvelteDocument_1.SvelteDocument(new documents_1.Document('someUrl', content));
        function extractComponent(filePath, range) {
            return __awaiter(this, void 0, void 0, function* () {
                return getRefactorings_1.executeRefactoringCommand(doc, getRefactorings_1.extractComponentCommand, [
                    '',
                    {
                        filePath,
                        range,
                        uri: ''
                    }
                ]);
            });
        }
        function shouldExtractComponent(path) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(5, 8), vscode_languageserver_1.Position.create(5, 25));
                const result = yield extractComponent(path, range);
                assert.deepStrictEqual(result, {
                    documentChanges: [
                        vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create('someUrl', null), [
                            vscode_languageserver_1.TextEdit.replace(range, '<NewComp></NewComp>'),
                            vscode_languageserver_1.TextEdit.insert(((_a = doc.script) === null || _a === void 0 ? void 0 : _a.startPos) || vscode_languageserver_1.Position.create(0, 0), "\n  import NewComp from './NewComp.svelte';\n")
                        ]),
                        vscode_languageserver_1.CreateFile.create('file:///NewComp.svelte', { overwrite: true }),
                        vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create('file:///NewComp.svelte', null), [
                            vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(0, 0), `${scriptContent}\n\n<p>extract me</p>\n\n${styleContent}\n\n`)
                        ])
                    ]
                });
            });
        }
        it('should extract component (no .svelte at the end)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield shouldExtractComponent('./NewComp');
        }));
        it('should extract component (no .svelte at the end, no relative path)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield shouldExtractComponent('NewComp');
        }));
        it('should extract component (.svelte at the end, no relative path', () => __awaiter(void 0, void 0, void 0, function* () {
            yield shouldExtractComponent('NewComp.svelte');
        }));
        it('should extract component (.svelte at the end, relative path)', () => __awaiter(void 0, void 0, void 0, function* () {
            yield shouldExtractComponent('./NewComp.svelte');
        }));
        it('should return "Invalid selection range"', () => __awaiter(void 0, void 0, void 0, function* () {
            const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(6, 8), vscode_languageserver_1.Position.create(6, 25));
            const result = yield extractComponent('Bla', range);
            assert.deepStrictEqual(result, 'Invalid selection range');
        }));
        it('should update relative imports', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const content = `<script>
            import OtherComponent from './OtherComponent.svelte';
            import {test} from '../test';
            </script>
            toExtract
            <style>
            @import './style.css';
            </style>`;
            const existingFileUri = utils_1.pathToUrl('C:/path/File.svelte');
            const doc = new SvelteDocument_1.SvelteDocument(new documents_1.Document(existingFileUri, content));
            const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(4, 12), vscode_languageserver_1.Position.create(4, 21));
            const result = yield getRefactorings_1.executeRefactoringCommand(doc, getRefactorings_1.extractComponentCommand, [
                '',
                {
                    filePath: '../NewComp',
                    range,
                    uri: ''
                }
            ]);
            const newFileUri = utils_1.pathToUrl('C:/NewComp.svelte');
            assert.deepStrictEqual(result, {
                documentChanges: [
                    vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(existingFileUri, null), [
                        vscode_languageserver_1.TextEdit.replace(range, '<NewComp></NewComp>'),
                        vscode_languageserver_1.TextEdit.insert(((_a = doc.script) === null || _a === void 0 ? void 0 : _a.startPos) || vscode_languageserver_1.Position.create(0, 0), "\n  import NewComp from '../NewComp.svelte';\n")
                    ]),
                    vscode_languageserver_1.CreateFile.create(newFileUri, { overwrite: true }),
                    vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(newFileUri, null), [
                        vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(0, 0), `<script>
            import OtherComponent from './path/OtherComponent.svelte';
            import {test} from './test';
            </script>\n\ntoExtract\n\n<style>
            @import './path/style.css';
            </style>\n\n`)
                    ])
                ]
            });
        }));
    }));
});
//# sourceMappingURL=getCodeAction.test.js.map