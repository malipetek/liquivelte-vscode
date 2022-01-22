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
const fs = require("fs");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const getDiagnostics_1 = require("../../../../src/plugins/svelte/features/getDiagnostics");
const SvelteDocument_1 = require("../../../../src/plugins/svelte/SvelteDocument");
const ls_config_1 = require("../../../../src/ls-config");
const utils_1 = require("../../../../src/utils");
const plugins_1 = require("../../../../src/plugins");
describe('SveltePlugin#getDiagnostics', () => {
    function expectDiagnosticsFor({ getTranspiled, getCompiled, config, settings = {}, docText = '<script></script>\n<style></style>' }) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = new documents_1.Document('', docText);
            const svelteDoc = { getTranspiled, getCompiled, config };
            const result = yield getDiagnostics_1.getDiagnostics(document, svelteDoc, settings);
            return {
                toEqual: (expected) => assert.deepStrictEqual(result, expected)
            };
        });
    }
    function setupFromFile(filename) {
        const testDir = path.join(__dirname, '..');
        const filePath = path.join(testDir, 'testfiles', filename);
        const document = new documents_1.Document(utils_1.pathToUrl(filePath), fs.readFileSync(filePath, 'utf-8'));
        const pluginManager = new ls_config_1.LSConfigManager();
        const plugin = new plugins_1.SveltePlugin(pluginManager);
        return { plugin, document };
    }
    it('expect svelte.config.js error', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => {
                throw new Error();
            },
            getCompiled: () => '',
            config: { loadConfigError: new Error('svelte.config.js') }
        })).toEqual([
            {
                message: 'Error in svelte.config.js\n\nError: svelte.config.js',
                range: {
                    start: {
                        character: 0,
                        line: 0
                    },
                    end: {
                        character: 5,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte'
            }
        ]);
    }));
    it('expect script transpilation error', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => {
                const e = new Error('Script');
                e.__source = SvelteDocument_1.TranspileErrorSource.Script;
                throw e;
            },
            getCompiled: () => '',
            config: {}
        })).toEqual([
            {
                message: 'Script',
                range: {
                    start: {
                        character: 8,
                        line: 0
                    },
                    end: {
                        character: 8,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte(script)'
            }
        ]);
    }));
    it('expect style transpilation error', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => {
                const e = new Error('Style');
                e.__source = SvelteDocument_1.TranspileErrorSource.Style;
                throw e;
            },
            getCompiled: () => '',
            config: {}
        })).toEqual([
            {
                message: 'Style',
                range: {
                    start: {
                        character: 7,
                        line: 1
                    },
                    end: {
                        character: 7,
                        line: 1
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte(style)'
            }
        ]);
    }));
    it('expect style transpilation error with line/columns', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => {
                const e = new Error('Style');
                e.line = 1;
                e.column = 0;
                e.__source = SvelteDocument_1.TranspileErrorSource.Style;
                throw e;
            },
            getCompiled: () => '',
            config: {}
        })).toEqual([
            {
                message: 'Style',
                range: {
                    start: {
                        character: 0,
                        line: 1
                    },
                    end: {
                        character: 0,
                        line: 1
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte(style)'
            }
        ]);
    }));
    it('expect compilation error', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: () => vscode_languageserver_1.Position.create(0, 0)
            }),
            getCompiled: () => {
                const e = new Error('Compilation');
                e.message = 'ERROR';
                e.code = 123;
                throw e;
            },
            config: {}
        })).toEqual([
            {
                code: 123,
                message: 'ERROR',
                range: {
                    start: {
                        character: 0,
                        line: 0
                    },
                    end: {
                        character: 0,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte'
            }
        ]);
    }));
    it('expect compilation error with expected', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: () => vscode_languageserver_1.Position.create(0, 8)
            }),
            getCompiled: () => {
                const e = new Error('Compilation');
                e.message = 'expected x to not be here';
                e.code = 123;
                e.start = { line: 1, column: 8 };
                throw e;
            },
            config: {}
        })).toEqual([
            {
                code: 123,
                message: 'expected x to not be here' +
                    '\n\nIf you expect this syntax to work, here are some suggestions: ' +
                    '\nIf you use typescript with `svelte-preprocess`, did you add `lang="ts"` to your `script` tag? ' +
                    '\nDid you setup a `svelte.config.js`? ' +
                    '\nSee https://github.com/sveltejs/language-tools/tree/master/docs#using-with-preprocessors for more info.',
                range: {
                    start: {
                        character: 8,
                        line: 0
                    },
                    end: {
                        character: 8,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte'
            }
        ]);
    }));
    it('expect valid position for compilation error', () => __awaiter(void 0, void 0, void 0, function* () {
        const message = 'Stores must be declared at the top level of the component (this may change in a future version of Svelte)';
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: () => vscode_languageserver_1.Position.create(-1, -1)
            }),
            getCompiled: () => {
                const e = new Error();
                e.message = message;
                e.code = 123;
                e.start = { line: 1, column: 8 };
                throw e;
            },
            config: {}
        })).toEqual([
            {
                code: 123,
                message,
                range: {
                    start: {
                        character: 0,
                        line: 0
                    },
                    end: {
                        character: 0,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte'
            }
        ]);
    }));
    it('expect warnings', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: (pos) => {
                    pos.line - 1;
                    return pos;
                }
            }),
            getCompiled: () => Promise.resolve({
                stats: {
                    warnings: [
                        {
                            start: { line: 1, column: 0 },
                            end: { line: 1, column: 0 },
                            message: 'warning',
                            code: 123
                        }
                    ]
                }
            }),
            config: {}
        })).toEqual([
            {
                code: 123,
                message: 'warning',
                range: {
                    start: {
                        character: 0,
                        line: 0
                    },
                    end: {
                        character: 0,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                source: 'svelte'
            }
        ]);
    }));
    it('filter out false positive warning (export enum)', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            docText: '<script context="module">export enum A { B }</script>',
            getTranspiled: () => ({
                getOriginalPosition: (pos) => {
                    return pos;
                }
            }),
            getCompiled: () => Promise.resolve({
                stats: {
                    warnings: [
                        {
                            start: { line: 1, column: 32 },
                            end: { line: 1, column: 33 },
                            message: "Component has unused export property 'A'. If it is for external reference only, please consider using `export const A`",
                            code: 'unused-export-let'
                        }
                    ]
                }
            }),
            config: {}
        })).toEqual([]);
    }));
    it('filter out false positive warning (export namespace)', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            docText: '<script context="module">export namespace foo { export function bar() {} }</script>',
            getTranspiled: () => ({
                getOriginalPosition: (pos) => {
                    return pos;
                }
            }),
            getCompiled: () => Promise.resolve({
                stats: {
                    warnings: [
                        {
                            start: { line: 1, column: 43 },
                            end: { line: 1, column: 46 },
                            message: "Component has unused export property 'foo'. If it is for external reference only, please consider using `export const foo`",
                            code: 'unused-export-let'
                        }
                    ]
                }
            }),
            config: {}
        })).toEqual([]);
    }));
    it('filter out warnings', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: (pos) => {
                    pos.line - 1;
                    return pos;
                }
            }),
            getCompiled: () => Promise.resolve({
                stats: {
                    warnings: [
                        {
                            start: { line: 1, column: 0 },
                            end: { line: 1, column: 0 },
                            message: 'warning',
                            code: '123'
                        }
                    ]
                }
            }),
            config: {},
            settings: { 123: 'ignore' }
        })).toEqual([]);
    }));
    it('treat warnings as error', () => __awaiter(void 0, void 0, void 0, function* () {
        (yield expectDiagnosticsFor({
            getTranspiled: () => ({
                getOriginalPosition: (pos) => {
                    pos.line - 1;
                    return pos;
                }
            }),
            getCompiled: () => Promise.resolve({
                stats: {
                    warnings: [
                        {
                            start: { line: 1, column: 0 },
                            end: { line: 1, column: 0 },
                            message: 'warning',
                            code: '123'
                        }
                    ]
                }
            }),
            config: {},
            settings: { 123: 'error' }
        })).toEqual([
            {
                code: '123',
                message: 'warning',
                range: {
                    start: {
                        character: 0,
                        line: 0
                    },
                    end: {
                        character: 0,
                        line: 0
                    }
                },
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                source: 'svelte'
            }
        ]);
    }));
    it('should correctly determine diagnostic position', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setupFromFile('diagnostics.svelte');
        const diagnostics = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics, [
            {
                range: { start: { line: 1, character: 15 }, end: { line: 1, character: 27 } },
                message: "Component has unused export property 'name'. If it is for external reference only, please consider using `export const name`",
                severity: 2,
                source: 'svelte',
                code: 'unused-export-let'
            }
        ]);
    }));
    it('should correctly determine diagnostic position for context="module"', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setupFromFile('diagnostics-module.svelte');
        const diagnostics = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics, [
            {
                range: { start: { line: 1, character: 15 }, end: { line: 1, character: 27 } },
                message: "Component has unused export property 'name'. If it is for external reference only, please consider using `export const name`",
                severity: 2,
                source: 'svelte',
                code: 'unused-export-let'
            }
        ]);
    }));
    it('should correctly determine diagnostic position for script when theres also context="module"', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setupFromFile('diagnostics-module-and-instance.svelte');
        const diagnostics = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics, [
            {
                code: 'unused-export-let',
                message: "Component has unused export property 'unused1'. If it is for external reference only, please consider using `export const unused1`",
                range: {
                    start: {
                        line: 5,
                        character: 13
                    },
                    end: {
                        line: 5,
                        character: 27
                    }
                },
                severity: 2,
                source: 'svelte'
            },
            {
                code: 'unused-export-let',
                message: "Component has unused export property 'unused2'. If it is for external reference only, please consider using `export const unused2`",
                range: {
                    start: {
                        line: 6,
                        character: 13
                    },
                    end: {
                        line: 6,
                        character: 27
                    }
                },
                severity: 2,
                source: 'svelte'
            }
        ]);
    }));
});
//# sourceMappingURL=getDiagnostics.test.js.map