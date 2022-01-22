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
const CodeActionsProvider_1 = require("../../../../src/plugins/typescript/features/CodeActionsProvider");
const CompletionProvider_1 = require("../../../../src/plugins/typescript/features/CompletionProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path.join(__dirname, '..');
describe('CodeActionsProvider', () => {
    function getFullPath(filename) {
        return path.join(testDir, 'testfiles', 'code-actions', filename);
    }
    function getUri(filename) {
        return utils_1.pathToUrl(getFullPath(filename));
    }
    function harmonizeNewLines(input) {
        return input.replace(/\r\n/g, '~:~').replace(/\n/g, '~:~').replace(/~:~/g, '\n');
    }
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const completionProvider = new CompletionProvider_1.CompletionsProviderImpl(lsAndTsDocResolver, new ls_config_1.LSConfigManager());
        const provider = new CodeActionsProvider_1.CodeActionsProviderImpl(lsAndTsDocResolver, completionProvider, new ls_config_1.LSConfigManager());
        const filePath = getFullPath(filename);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: harmonizeNewLines(typescript_1.default.sys.readFile(filePath) || '')
        });
        return { provider, document, docManager };
    }
    it('provides quickfix', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('codeactions.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(6, 4), vscode_languageserver_1.Position.create(6, 5)), {
            diagnostics: [
                {
                    code: 6133,
                    message: "'a' is declared but its value is never read.",
                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(6, 4), vscode_languageserver_1.Position.create(6, 5)),
                    source: 'ts'
                }
            ],
            only: [vscode_languageserver_1.CodeActionKind.QuickFix]
        });
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 6
                                        },
                                        end: {
                                            character: 0,
                                            line: 7
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('codeactions.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: vscode_languageserver_1.CodeActionKind.QuickFix,
                title: "Remove unused declaration for: 'a'"
            }
        ]);
    }));
    it('provides quickfix for missing function', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('codeactions.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(9, 0), vscode_languageserver_1.Position.create(9, 3)), {
            diagnostics: [
                {
                    code: 2304,
                    message: "Cannot find name 'abc'.",
                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(9, 0), vscode_languageserver_1.Position.create(9, 3)),
                    source: 'ts'
                }
            ],
            only: [vscode_languageserver_1.CodeActionKind.QuickFix]
        });
        testFixMissingFunctionQuickFix(codeActions);
    }));
    it('provides quickfix for missing function called in the markup', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('codeactions.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(11, 1), vscode_languageserver_1.Position.create(11, 4)), {
            diagnostics: [
                {
                    code: 2304,
                    message: "Cannot find name 'abc'.",
                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(11, 1), vscode_languageserver_1.Position.create(11, 4)),
                    source: 'ts'
                }
            ],
            only: [vscode_languageserver_1.CodeActionKind.QuickFix]
        });
        testFixMissingFunctionQuickFix(codeActions);
    }));
    function testFixMissingFunctionQuickFix(codeActions) {
        var _a, _b, _c, _d;
        (_d = (_c = (_b = (_a = codeActions[0]) === null || _a === void 0 ? void 0 : _a.edit) === null || _b === void 0 ? void 0 : _b.documentChanges) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: "\n\nfunction abc() {\nthrow new Error('Function not implemented.');\n}\n",
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 10
                                        },
                                        end: {
                                            character: 0,
                                            line: 10
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('codeactions.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: vscode_languageserver_1.CodeActionKind.QuickFix,
                title: "Add missing function declaration 'abc'"
            }
        ]);
    }
    it('provides quickfix for ts-checked-js', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const { provider, document } = setup('codeaction-checkJs.svelte');
        const errorRange = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(2, 21), vscode_languageserver_1.Position.create(2, 26));
        const codeActions = yield provider.getCodeActions(document, errorRange, {
            diagnostics: [
                {
                    code: 2304,
                    message: "Cannot find name 'blubb'.",
                    range: errorRange
                }
            ]
        });
        for (const codeAction of codeActions) {
            (_c = (_b = (_a = codeAction.edit) === null || _a === void 0 ? void 0 : _a.documentChanges) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        }
        const textDocument = {
            uri: getUri('codeaction-checkJs.svelte'),
            version: null
        };
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: '\nimport { blubb } from "../definitions";\n\n',
                                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 8), vscode_languageserver_1.Position.create(0, 8))
                                }
                            ],
                            textDocument
                        }
                    ]
                },
                kind: 'quickfix',
                title: 'Import \'blubb\' from module "../definitions"'
            },
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: '// @ts-ignore\n    ',
                                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(2, 4), vscode_languageserver_1.Position.create(2, 4))
                                }
                            ],
                            textDocument
                        }
                    ]
                },
                kind: 'quickfix',
                title: 'Ignore this error message'
            },
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: '\n// @ts-nocheck',
                                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 8), vscode_languageserver_1.Position.create(0, 8))
                                }
                            ],
                            textDocument
                        }
                    ]
                },
                kind: 'quickfix',
                title: 'Disable checking for this file'
            }
        ]);
    }));
    it('provides quickfix for component import', () => __awaiter(void 0, void 0, void 0, function* () {
        var _d, _e, _f, _g;
        const { provider, document } = setup('codeactions.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(12, 1), vscode_languageserver_1.Position.create(12, 1)), {
            diagnostics: [
                {
                    code: 2304,
                    message: "Cannot find name 'Empty'.",
                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(12, 1), vscode_languageserver_1.Position.create(12, 6)),
                    source: 'ts'
                }
            ],
            only: [vscode_languageserver_1.CodeActionKind.QuickFix]
        });
        (_g = (_f = (_e = (_d = codeActions[0]) === null || _d === void 0 ? void 0 : _d.edit) === null || _e === void 0 ? void 0 : _e.documentChanges) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: harmonizeNewLines("import Empty from '../empty.svelte';\n"),
                                    range: {
                                        end: vscode_languageserver_1.Position.create(5, 0),
                                        start: vscode_languageserver_1.Position.create(5, 0)
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('codeactions.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: 'quickfix',
                title: 'Import default \'Empty\' from module "../empty.svelte"'
            }
        ]);
    }));
    it('organizes imports', () => __awaiter(void 0, void 0, void 0, function* () {
        var _h, _j, _k, _l;
        const { provider, document } = setup('codeactions.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 5)), // irrelevant
        {
            diagnostics: [],
            only: [vscode_languageserver_1.CodeActionKind.SourceOrganizeImports]
        });
        (_l = (_k = (_j = (_h = codeActions[0]) === null || _h === void 0 ? void 0 : _h.edit) === null || _j === void 0 ? void 0 : _j.documentChanges) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    // eslint-disable-next-line max-len
                                    newText: "import { A } from 'bla';\nimport { C } from 'blubb';\n",
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 1
                                        },
                                        end: {
                                            character: 0,
                                            line: 2
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 2
                                        },
                                        end: {
                                            character: 0,
                                            line: 3
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 3
                                        },
                                        end: {
                                            character: 0,
                                            line: 4
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            character: 0,
                                            line: 4
                                        },
                                        end: {
                                            character: 0,
                                            line: 5
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('codeactions.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: vscode_languageserver_1.CodeActionKind.SourceOrganizeImports,
                title: 'Organize Imports'
            }
        ]);
    }));
    it('organizes imports with module script', () => __awaiter(void 0, void 0, void 0, function* () {
        var _m, _o, _p, _q;
        const { provider, document } = setup('organize-imports-with-module.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 5)), // irrelevant
        {
            diagnostics: [],
            only: [vscode_languageserver_1.CodeActionKind.SourceOrganizeImports]
        });
        (_q = (_p = (_o = (_m = codeActions[0]) === null || _m === void 0 ? void 0 : _m.edit) === null || _o === void 0 ? void 0 : _o.documentChanges) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    // eslint-disable-next-line max-len
                                    newText: "import A from './A';\n  import { c } from './c';\n",
                                    range: {
                                        start: {
                                            line: 1,
                                            character: 2
                                        },
                                        end: {
                                            line: 2,
                                            character: 0
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            line: 6,
                                            character: 2
                                        },
                                        end: {
                                            line: 7,
                                            character: 2
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            line: 7,
                                            character: 2
                                        },
                                        end: {
                                            line: 8,
                                            character: 0
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('organize-imports-with-module.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: vscode_languageserver_1.CodeActionKind.SourceOrganizeImports,
                title: 'Organize Imports'
            }
        ]);
    }));
    it('organizes imports with module script and store', () => __awaiter(void 0, void 0, void 0, function* () {
        var _r, _s, _t, _u;
        const { provider, document } = setup('organize-imports-module-store.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 5)), // irrelevant
        {
            diagnostics: [],
            only: [vscode_languageserver_1.CodeActionKind.SourceOrganizeImports]
        });
        (_u = (_t = (_s = (_r = codeActions[0]) === null || _r === void 0 ? void 0 : _r.edit) === null || _s === void 0 ? void 0 : _s.documentChanges) === null || _t === void 0 ? void 0 : _t[0]) === null || _u === void 0 ? void 0 : _u.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: "import { _,_d } from 'svelte-i18n';\n  import { _e } from 'svelte-i18n1';\n",
                                    range: {
                                        end: {
                                            character: 0,
                                            line: 2
                                        },
                                        start: {
                                            character: 2,
                                            line: 1
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        end: {
                                            character: 2,
                                            line: 6
                                        },
                                        start: {
                                            character: 2,
                                            line: 5
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        end: {
                                            character: 2,
                                            line: 7
                                        },
                                        start: {
                                            character: 2,
                                            line: 6
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        start: {
                                            character: 2,
                                            line: 7
                                        },
                                        end: {
                                            character: 0,
                                            line: 8
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('organize-imports-module-store.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: vscode_languageserver_1.CodeActionKind.SourceOrganizeImports,
                title: 'Organize Imports'
            }
        ]);
    }));
    it('organizes imports which changes nothing (one import)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _v, _w, _x, _y;
        const { provider, document } = setup('organize-imports-unchanged1.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 5)), // irrelevant
        {
            diagnostics: [],
            only: [vscode_languageserver_1.CodeActionKind.SourceOrganizeImports]
        });
        (_y = (_x = (_w = (_v = codeActions[0]) === null || _v === void 0 ? void 0 : _v.edit) === null || _w === void 0 ? void 0 : _w.documentChanges) === null || _x === void 0 ? void 0 : _x[0]) === null || _y === void 0 ? void 0 : _y.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: "import { c } from './c';\n",
                                    range: {
                                        end: {
                                            character: 0,
                                            line: 2
                                        },
                                        start: {
                                            character: 2,
                                            line: 1
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('organize-imports-unchanged1.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: 'source.organizeImports',
                title: 'Organize Imports'
            }
        ]);
    }));
    it('organizes imports which changes nothing (two imports)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _z, _0, _1, _2;
        const { provider, document } = setup('organize-imports-unchanged2.svelte');
        const codeActions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 4), vscode_languageserver_1.Position.create(1, 5)), // irrelevant
        {
            diagnostics: [],
            only: [vscode_languageserver_1.CodeActionKind.SourceOrganizeImports]
        });
        (_2 = (_1 = (_0 = (_z = codeActions[0]) === null || _z === void 0 ? void 0 : _z.edit) === null || _0 === void 0 ? void 0 : _0.documentChanges) === null || _1 === void 0 ? void 0 : _1[0]) === null || _2 === void 0 ? void 0 : _2.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(codeActions, [
            {
                edit: {
                    documentChanges: [
                        {
                            edits: [
                                {
                                    newText: "import { c } from './c';\n  import { d } from './d';\n",
                                    range: {
                                        end: {
                                            character: 0,
                                            line: 2
                                        },
                                        start: {
                                            character: 2,
                                            line: 1
                                        }
                                    }
                                },
                                {
                                    newText: '',
                                    range: {
                                        end: {
                                            character: 0,
                                            line: 3
                                        },
                                        start: {
                                            character: 0,
                                            line: 2
                                        }
                                    }
                                }
                            ],
                            textDocument: {
                                uri: getUri('organize-imports-unchanged2.svelte'),
                                version: null
                            }
                        }
                    ]
                },
                kind: 'source.organizeImports',
                title: 'Organize Imports'
            }
        ]);
    }));
    it('should do extract into const refactor', () => __awaiter(void 0, void 0, void 0, function* () {
        var _3, _4, _5, _6;
        const { provider, document } = setup('codeactions.svelte');
        const actions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(8, 8), vscode_languageserver_1.Position.create(8, 42)), { diagnostics: [], only: [vscode_languageserver_1.CodeActionKind.Refactor] });
        const action = actions[1];
        assert.deepStrictEqual(action, {
            command: {
                arguments: [
                    getUri('codeactions.svelte'),
                    {
                        type: 'refactor',
                        refactorName: 'Extract Symbol',
                        originalRange: {
                            start: {
                                character: 8,
                                line: 8
                            },
                            end: {
                                character: 42,
                                line: 8
                            }
                        },
                        textRange: {
                            pos: 184,
                            end: 218
                        }
                    }
                ],
                command: 'constant_scope_0',
                title: 'Extract to constant in enclosing scope'
            },
            title: 'Extract to constant in enclosing scope'
        });
        const edit = yield provider.executeCommand(document, ((_3 = action.command) === null || _3 === void 0 ? void 0 : _3.command) || '', (_4 = action.command) === null || _4 === void 0 ? void 0 : _4.arguments);
        (_6 = (_5 = edit === null || edit === void 0 ? void 0 : edit.documentChanges) === null || _5 === void 0 ? void 0 : _5[0]) === null || _6 === void 0 ? void 0 : _6.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(edit, {
            documentChanges: [
                {
                    edits: [
                        {
                            // eslint-disable-next-line max-len
                            newText: 'const newLocal=Math.random()>0.5? true:false;\n',
                            range: {
                                start: {
                                    character: 0,
                                    line: 8
                                },
                                end: {
                                    character: 0,
                                    line: 8
                                }
                            }
                        },
                        {
                            newText: 'newLocal',
                            range: {
                                start: {
                                    character: 8,
                                    line: 8
                                },
                                end: {
                                    character: 42,
                                    line: 8
                                }
                            }
                        }
                    ],
                    textDocument: {
                        uri: getUri('codeactions.svelte'),
                        version: null
                    }
                }
            ]
        });
    }));
    it('should do extract into function refactor', () => __awaiter(void 0, void 0, void 0, function* () {
        var _7, _8, _9, _10;
        const { provider, document } = setup('codeactions.svelte');
        const actions = yield provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(8, 8), vscode_languageserver_1.Position.create(8, 42)), { diagnostics: [], only: [vscode_languageserver_1.CodeActionKind.Refactor] });
        const action = actions[0];
        assert.deepStrictEqual(action, {
            command: {
                arguments: [
                    getUri('codeactions.svelte'),
                    {
                        type: 'refactor',
                        refactorName: 'Extract Symbol',
                        originalRange: {
                            start: {
                                character: 8,
                                line: 8
                            },
                            end: {
                                character: 42,
                                line: 8
                            }
                        },
                        textRange: {
                            pos: 184,
                            end: 218
                        }
                    }
                ],
                command: 'function_scope_0a',
                title: "Extract to inner function in function 'render'"
            },
            title: 'Extract to function'
        });
        const edit = yield provider.executeCommand(document, ((_7 = action.command) === null || _7 === void 0 ? void 0 : _7.command) || '', (_8 = action.command) === null || _8 === void 0 ? void 0 : _8.arguments);
        (_10 = (_9 = edit === null || edit === void 0 ? void 0 : edit.documentChanges) === null || _9 === void 0 ? void 0 : _9[0]) === null || _10 === void 0 ? void 0 : _10.edits.forEach((edit) => (edit.newText = harmonizeNewLines(edit.newText)));
        assert.deepStrictEqual(edit, {
            documentChanges: [
                {
                    edits: [
                        {
                            newText: 'newFunction()',
                            range: {
                                start: {
                                    character: 8,
                                    line: 8
                                },
                                end: {
                                    character: 42,
                                    line: 8
                                }
                            }
                        },
                        {
                            newText: '\n' +
                                '\n' +
                                'function newFunction() {' +
                                '\n' +
                                'return Math.random()>0.5? true:false;' +
                                '\n' +
                                '}' +
                                '\n',
                            range: {
                                start: {
                                    character: 0,
                                    line: 10
                                },
                                end: {
                                    character: 0,
                                    line: 10
                                }
                            }
                        }
                    ],
                    textDocument: {
                        uri: getUri('codeactions.svelte'),
                        version: null
                    }
                }
            ]
        });
    }));
    it('can cancel quick fix before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('codeactions.svelte');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const codeActionsPromise = provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(6, 4), vscode_languageserver_1.Position.create(6, 5)), {
            diagnostics: [
                {
                    code: 6133,
                    message: "'a' is declared but its value is never read.",
                    range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(6, 4), vscode_languageserver_1.Position.create(6, 5)),
                    source: 'ts'
                }
            ],
            only: [vscode_languageserver_1.CodeActionKind.QuickFix]
        }, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert.deepStrictEqual(yield codeActionsPromise, []);
    }));
    it('can cancel refactor before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup('codeactions.svelte');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const codeActionsPromise = provider.getCodeActions(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(8, 8), vscode_languageserver_1.Position.create(8, 42)), { diagnostics: [], only: [vscode_languageserver_1.CodeActionKind.Refactor] }, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert.deepStrictEqual(yield codeActionsPromise, []);
    }));
});
//# sourceMappingURL=CodeActionsProvider.test.js.map