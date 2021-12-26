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
const sinon_1 = require("sinon");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const documents_1 = require("../../src/lib/documents");
const plugins_1 = require("../../src/plugins");
const vscode_languageserver_1 = require("vscode-languageserver");
const assert_1 = require("assert");
describe('PluginHost', () => {
    const textDocument = {
        uri: 'file:///hello.svelte',
        version: 0,
        languageId: 'svelte',
        text: 'Hello, world!'
    };
    function setup(pluginProviderStubs, config = {
        definitionLinkSupport: true,
        filterIncompleteCompletions: false
    }) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const pluginHost = new plugins_1.PluginHost(docManager);
        const plugin = Object.assign({}, pluginProviderStubs);
        pluginHost.initialize(config);
        pluginHost.register(plugin);
        return { docManager, pluginHost, plugin };
    }
    it('executes getDiagnostics on plugins', () => __awaiter(void 0, void 0, void 0, function* () {
        const { docManager, pluginHost, plugin } = setup({
            getDiagnostics: sinon_1.default.stub().returns([])
        });
        const document = docManager.openDocument(textDocument);
        yield pluginHost.getDiagnostics(textDocument);
        sinon_1.default.assert.calledOnce(plugin.getDiagnostics);
        sinon_1.default.assert.calledWithExactly(plugin.getDiagnostics, document);
    }));
    it('executes doHover on plugins', () => __awaiter(void 0, void 0, void 0, function* () {
        const { docManager, pluginHost, plugin } = setup({
            doHover: sinon_1.default.stub().returns(null)
        });
        const document = docManager.openDocument(textDocument);
        const pos = vscode_languageserver_types_1.Position.create(0, 0);
        yield pluginHost.doHover(textDocument, pos);
        sinon_1.default.assert.calledOnce(plugin.doHover);
        sinon_1.default.assert.calledWithExactly(plugin.doHover, document, pos);
    }));
    it('executes getCompletions on plugins', () => __awaiter(void 0, void 0, void 0, function* () {
        const { docManager, pluginHost, plugin } = setup({
            getCompletions: sinon_1.default.stub().returns({ items: [] })
        });
        const document = docManager.openDocument(textDocument);
        const pos = vscode_languageserver_types_1.Position.create(0, 0);
        yield pluginHost.getCompletions(textDocument, pos, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '.'
        });
        sinon_1.default.assert.calledOnce(plugin.getCompletions);
        sinon_1.default.assert.calledWithExactly(plugin.getCompletions, document, pos, {
            triggerKind: vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter,
            triggerCharacter: '.'
        }, undefined);
    }));
    describe('getCompletions (incomplete)', () => {
        function setupGetIncompleteCompletions(filterServerSide) {
            const { docManager, pluginHost } = setup({
                getCompletions: sinon_1.default.stub().returns({
                    isIncomplete: true,
                    items: [{ label: 'Hello' }, { label: 'foo' }]
                })
            }, { definitionLinkSupport: true, filterIncompleteCompletions: filterServerSide });
            docManager.openDocument(textDocument);
            return pluginHost;
        }
        it('filters client side', () => __awaiter(void 0, void 0, void 0, function* () {
            const pluginHost = setupGetIncompleteCompletions(false);
            const completions = yield pluginHost.getCompletions(textDocument, vscode_languageserver_types_1.Position.create(0, 2));
            assert_1.default.deepStrictEqual(completions.items, [
                { label: 'Hello' },
                { label: 'foo' }
            ]);
        }));
        it('filters server side', () => __awaiter(void 0, void 0, void 0, function* () {
            const pluginHost = setupGetIncompleteCompletions(true);
            const completions = yield pluginHost.getCompletions(textDocument, vscode_languageserver_types_1.Position.create(0, 2));
            assert_1.default.deepStrictEqual(completions.items, [{ label: 'Hello' }]);
        }));
    });
    describe('getDefinitions', () => {
        function setupGetDefinitions(linkSupport) {
            const { pluginHost, docManager } = setup({
                getDefinitions: sinon_1.default.stub().returns([
                    {
                        targetRange: vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), vscode_languageserver_types_1.Position.create(0, 2)),
                        targetSelectionRange: vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), vscode_languageserver_types_1.Position.create(0, 1)),
                        targetUri: 'uri'
                    }
                ])
            }, { definitionLinkSupport: linkSupport, filterIncompleteCompletions: false });
            docManager.openDocument(textDocument);
            return pluginHost;
        }
        it('uses LocationLink', () => __awaiter(void 0, void 0, void 0, function* () {
            const pluginHost = setupGetDefinitions(true);
            const definitions = yield pluginHost.getDefinitions(textDocument, vscode_languageserver_types_1.Position.create(0, 0));
            assert_1.default.deepStrictEqual(definitions, [
                {
                    targetRange: vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), vscode_languageserver_types_1.Position.create(0, 2)),
                    targetSelectionRange: vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), vscode_languageserver_types_1.Position.create(0, 1)),
                    targetUri: 'uri'
                }
            ]);
        }));
        it('uses Location', () => __awaiter(void 0, void 0, void 0, function* () {
            const pluginHost = setupGetDefinitions(false);
            const definitions = yield pluginHost.getDefinitions(textDocument, vscode_languageserver_types_1.Position.create(0, 0));
            assert_1.default.deepStrictEqual(definitions, [
                {
                    range: vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), vscode_languageserver_types_1.Position.create(0, 1)),
                    uri: 'uri'
                }
            ]);
        }));
    });
});
//# sourceMappingURL=PluginHost.test.js.map