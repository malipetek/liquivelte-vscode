"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const typescript_1 = require("typescript");
const assert_1 = require("assert");
const documents_1 = require("../../../../src/lib/documents");
const utils_1 = require("../../../../src/utils");
const vscode_languageserver_1 = require("vscode-languageserver");
const getDirectiveCommentCompletions_1 = require("../../../../src/plugins/typescript/features/getDirectiveCommentCompletions");
describe('can get typescript directive comment completions', () => {
    function setup(position, context = { triggerKind: vscode_languageserver_1.CompletionTriggerKind.Invoked }) {
        const testDir = path_1.default.join(__dirname, '..');
        const filePath = path_1.default.join(testDir, 'testfiles', 'completions', 'ts-directive-comment.svelte');
        const document = new documents_1.Document(utils_1.pathToUrl(filePath), typescript_1.default.sys.readFile(filePath));
        const result = getDirectiveCommentCompletions_1.getDirectiveCommentCompletions(position, document, context);
        return result;
    }
    function testForScript(position) {
        const result = setup(position);
        assert_1.default.deepStrictEqual(result, {
            isIncomplete: false,
            items: [
                {
                    detail: 'Enables semantic checking in a JavaScript file. Must be at the top of a file.',
                    kind: 15,
                    label: '@ts-check',
                    textEdit: {
                        newText: '@ts-check',
                        range: {
                            end: {
                                character: 11,
                                line: position.line
                            },
                            start: {
                                character: 2,
                                line: position.line
                            }
                        }
                    }
                },
                {
                    detail: 'Disables semantic checking in a JavaScript file. Must be at the top of a file.',
                    kind: 15,
                    label: '@ts-nocheck',
                    textEdit: {
                        newText: '@ts-nocheck',
                        range: {
                            end: {
                                character: 13,
                                line: position.line
                            },
                            start: {
                                character: 2,
                                line: position.line
                            }
                        }
                    }
                },
                {
                    detail: 'Suppresses @ts-check errors on the next line of a file.',
                    kind: 15,
                    label: '@ts-ignore',
                    textEdit: {
                        newText: '@ts-ignore',
                        range: {
                            end: {
                                character: 12,
                                line: position.line
                            },
                            start: {
                                character: 2,
                                line: position.line
                            }
                        }
                    }
                },
                {
                    detail: 'Suppresses @ts-check errors on the next line of a file, expecting at least one to exist.',
                    kind: 15,
                    label: '@ts-expect-error',
                    textEdit: {
                        newText: '@ts-expect-error',
                        range: {
                            end: {
                                character: 18,
                                line: position.line
                            },
                            start: {
                                character: 2,
                                line: position.line
                            }
                        }
                    }
                }
            ]
        });
    }
    it('provides in instance scripts', () => {
        testForScript(vscode_languageserver_1.Position.create(1, 3));
    });
    it('provides in module scripts', () => {
        testForScript(vscode_languageserver_1.Position.create(5, 3));
    });
    it("don't provide in markup", () => {
        const result = setup(vscode_languageserver_1.Position.create(7, 3));
        assert_1.default.deepStrictEqual(result, null);
    });
});
//# sourceMappingURL=getDirectiveCommentCompletions.test.js.map