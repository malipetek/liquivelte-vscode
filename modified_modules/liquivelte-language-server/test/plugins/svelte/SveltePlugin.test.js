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
const plugins_1 = require("../../../src/plugins");
const documents_1 = require("../../../src/lib/documents");
const vscode_languageserver_1 = require("vscode-languageserver");
const ls_config_1 = require("../../../src/ls-config");
const importPackage = require("../../../src/importPackage");
const sinon_1 = require("sinon");
describe('Svelte Plugin', () => {
    function setup(content, prettierConfig, trusted = true) {
        const document = new documents_1.Document('file:///hello.svelte', content);
        const docManager = new documents_1.DocumentManager(() => document);
        const pluginManager = new ls_config_1.LSConfigManager();
        pluginManager.updateIsTrusted(trusted);
        pluginManager.updatePrettierConfig(prettierConfig);
        const plugin = new plugins_1.SveltePlugin(pluginManager);
        docManager.openDocument('some doc');
        return { plugin, document };
    }
    it('provides diagnostic warnings', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<h1>Hello, world!</h1>\n<img src="hello.png">');
        const diagnostics = yield plugin.getDiagnostics(document);
        const diagnostic = vscode_languageserver_1.Diagnostic.create(vscode_languageserver_1.Range.create(1, 0, 1, 21), 'A11y: <img> element should have an alt attribute', vscode_languageserver_1.DiagnosticSeverity.Warning, 'a11y-missing-attribute', 'svelte');
        assert.deepStrictEqual(diagnostics, [diagnostic]);
    }));
    it('provides diagnostic errors', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div bind:whatever></div>');
        const diagnostics = yield plugin.getDiagnostics(document);
        const diagnostic = vscode_languageserver_1.Diagnostic.create(vscode_languageserver_1.Range.create(0, 10, 0, 18), 'whatever is not declared', vscode_languageserver_1.DiagnosticSeverity.Error, 'binding-undeclared', 'svelte');
        assert.deepStrictEqual(diagnostics, [diagnostic]);
    }));
    it('provides no diagnostic errors when untrusted', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div bind:whatever></div>', {}, false);
        const diagnostics = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics, []);
    }));
    describe('#formatDocument', () => {
        function stubPrettier(config) {
            const formatStub = sinon_1.default.stub().returns('formatted');
            sinon_1.default.stub(importPackage, 'importPrettier').returns({
                resolveConfig: () => Promise.resolve(config),
                getFileInfo: () => ({ ignored: false }),
                format: formatStub,
                getSupportInfo: () => ({ languages: [{ name: 'svelte' }] })
            });
            return formatStub;
        }
        function testFormat(config, fallbackPrettierConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                const { plugin, document } = setup('unformatted', fallbackPrettierConfig);
                const formatStub = stubPrettier(config);
                const formatted = yield plugin.formatDocument(document, {
                    insertSpaces: true,
                    tabSize: 4
                });
                assert.deepStrictEqual(formatted, [
                    {
                        newText: 'formatted',
                        range: {
                            end: {
                                character: 11,
                                line: 0
                            },
                            start: {
                                character: 0,
                                line: 0
                            }
                        }
                    }
                ]);
                return formatStub;
            });
        }
        afterEach(() => {
            sinon_1.default.restore();
        });
        it('should use config for formatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const formatStub = yield testFormat({ fromConfig: true }, { fallbackConfig: true });
            sinon_1.default.assert.calledOnceWithExactly(formatStub, 'unformatted', {
                fromConfig: true,
                plugins: [],
                parser: 'svelte'
            });
        }));
        const defaultSettings = {
            svelteSortOrder: 'options-scripts-markup-styles',
            svelteStrictMode: false,
            svelteAllowShorthand: true,
            svelteBracketNewLine: true,
            svelteIndentScriptAndStyle: true,
            printWidth: 80,
            singleQuote: false
        };
        it('should use prettier fallback config for formatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const formatStub = yield testFormat(undefined, { fallbackConfig: true });
            sinon_1.default.assert.calledOnceWithExactly(formatStub, 'unformatted', Object.assign({ fallbackConfig: true, plugins: [], parser: 'svelte' }, defaultSettings));
        }));
        it('should use FormattingOptions for formatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const formatStub = yield testFormat(undefined, undefined);
            sinon_1.default.assert.calledOnceWithExactly(formatStub, 'unformatted', Object.assign({ tabWidth: 4, useTabs: false, plugins: [], parser: 'svelte' }, defaultSettings));
        }));
        it('should use FormattingOptions for formatting when configs are empty objects', () => __awaiter(void 0, void 0, void 0, function* () {
            const formatStub = yield testFormat({}, {});
            sinon_1.default.assert.calledOnceWithExactly(formatStub, 'unformatted', Object.assign({ tabWidth: 4, useTabs: false, plugins: [], parser: 'svelte' }, defaultSettings));
        }));
    });
    it('can cancel completion before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('{#');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const completionsPromise = plugin.getCompletions(document, { line: 0, character: 2 }, undefined, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert.deepStrictEqual(yield completionsPromise, null);
    }));
    it('can cancel code action before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<a></a>');
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const range = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 7 }
        };
        const codeActionPromise = plugin.getCodeActions(document, range, {
            diagnostics: [
                {
                    message: 'A11y: <a> element should have child content',
                    code: 'a11y-missing-content',
                    range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                    source: 'svelte'
                }
            ]
        }, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert.deepStrictEqual(yield codeActionPromise, []);
    }));
});
//# sourceMappingURL=SveltePlugin.test.js.map