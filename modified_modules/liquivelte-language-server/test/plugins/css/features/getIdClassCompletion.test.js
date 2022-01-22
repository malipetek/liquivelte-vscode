"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const plugins_1 = require("../../../../src/plugins");
const CSSDocument_1 = require("../../../../src/plugins/css/CSSDocument");
const getIdClassCompletion_1 = require("../../../../src/plugins/css/features/getIdClassCompletion");
describe('getIdClassCompletion', () => {
    function createDocument(content) {
        return new documents_1.Document('file:///hello.svelte', content);
    }
    function createCSSDocument(content) {
        return new CSSDocument_1.CSSDocument(createDocument(content));
    }
    function testSelectors(items, expectedSelectors) {
        assert_1.default.deepStrictEqual(items.map((item) => item.label), expectedSelectors, 'vscode-language-services might have changed the NodeType enum. Check if we need to update it');
    }
    it('collect css classes', () => {
        const actual = getIdClassCompletion_1.collectSelectors(createCSSDocument('<style>.abc {}</style>').stylesheet, getIdClassCompletion_1.NodeType.ClassSelector);
        testSelectors(actual, ['abc']);
    });
    it('collect css ids', () => {
        const actual = getIdClassCompletion_1.collectSelectors(createCSSDocument('<style>#abc {}</style>').stylesheet, getIdClassCompletion_1.NodeType.IdentifierSelector);
        testSelectors(actual, ['abc']);
    });
    function setup(content) {
        const document = createDocument(content);
        const docManager = new documents_1.DocumentManager(() => document);
        const pluginManager = new ls_config_1.LSConfigManager();
        const plugin = new plugins_1.CSSPlugin(docManager, pluginManager);
        docManager.openDocument('some doc');
        return { plugin, document };
    }
    it('provides css classes completion for class attribute', () => {
        const { plugin, document } = setup('<div class=></div><style>.abc{}</style>');
        assert_1.default.deepStrictEqual(plugin.getCompletions(document, { line: 0, character: 11 }), {
            isIncomplete: false,
            items: [{ label: 'abc', kind: vscode_languageserver_1.CompletionItemKind.Keyword }]
        });
    });
    it('provides css classes completion for class directive', () => {
        const { plugin, document } = setup('<div class:></div><style>.abc{}</style>');
        assert_1.default.deepStrictEqual(plugin.getCompletions(document, { line: 0, character: 11 }), {
            isIncomplete: false,
            items: [{ label: 'abc', kind: vscode_languageserver_1.CompletionItemKind.Keyword }]
        });
    });
    it('provides css id completion for id attribute', () => {
        const { plugin, document } = setup('<div id=></div><style>#abc{}</style>');
        assert_1.default.deepStrictEqual(plugin.getCompletions(document, { line: 0, character: 8 }), {
            isIncomplete: false,
            items: [{ label: 'abc', kind: vscode_languageserver_1.CompletionItemKind.Keyword }]
        });
    });
});
//# sourceMappingURL=getIdClassCompletion.test.js.map