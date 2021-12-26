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
const vscode_languageserver_1 = require("vscode-languageserver");
const plugins_1 = require("../../../src/plugins");
const documents_1 = require("../../../src/lib/documents");
const ls_config_1 = require("../../../src/ls-config");
describe('HTML Plugin', () => {
    function setup(content) {
        const document = new documents_1.Document('file:///hello.svelte', content);
        const docManager = new documents_1.DocumentManager(() => document);
        const pluginManager = new ls_config_1.LSConfigManager();
        const plugin = new plugins_1.HTMLPlugin(docManager, pluginManager);
        docManager.openDocument('some doc');
        return { plugin, document };
    }
    it('provides hover info', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<h1>Hello, world!</h1>');
        assert.deepStrictEqual(plugin.doHover(document, vscode_languageserver_1.Position.create(0, 2)), {
            contents: {
                kind: 'markdown',
                value: 'The h1 element represents a section heading.\n\n[MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/Heading_Elements)'
            },
            range: vscode_languageserver_1.Range.create(0, 1, 0, 3)
        });
        assert.strictEqual(plugin.doHover(document, vscode_languageserver_1.Position.create(0, 10)), null);
    }));
    it('does not provide hover info for component having the same name as a html element but being uppercase', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<Div></Div>');
        assert.deepStrictEqual(plugin.doHover(document, vscode_languageserver_1.Position.create(0, 2)), null);
    }));
    it('provides completions', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<');
        const completions = plugin.getCompletions(document, vscode_languageserver_1.Position.create(0, 1));
        assert.ok(Array.isArray(completions && completions.items));
        assert.ok(completions.items.length > 0);
        assert.deepStrictEqual(completions.items[0], {
            label: '!DOCTYPE',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            documentation: 'A preamble for an HTML document.',
            textEdit: vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(0, 1), '!DOCTYPE html>'),
            insertTextFormat: vscode_languageserver_1.InsertTextFormat.PlainText
        });
    }));
    it('does not provide completions inside of moustache tag', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div on:click={() =>');
        const completions = plugin.getCompletions(document, vscode_languageserver_1.Position.create(0, 20));
        assert.strictEqual(completions, null);
        const tagCompletion = plugin.doTagComplete(document, vscode_languageserver_1.Position.create(0, 20));
        assert.strictEqual(tagCompletion, null);
    }));
    it('does provide completions outside of moustache tag', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div on:click={bla} >');
        const completions = plugin.getCompletions(document, vscode_languageserver_1.Position.create(0, 21));
        assert.deepEqual(completions === null || completions === void 0 ? void 0 : completions.items[0], {
            filterText: '</div>',
            insertTextFormat: 2,
            kind: 10,
            label: '</div>',
            textEdit: {
                newText: '$0</div>',
                range: {
                    end: {
                        character: 21,
                        line: 0
                    },
                    start: {
                        character: 21,
                        line: 0
                    }
                }
            }
        });
        const tagCompletion = plugin.doTagComplete(document, vscode_languageserver_1.Position.create(0, 21));
        assert.strictEqual(tagCompletion, '$0</div>');
    }));
    it('does provide lang in completions', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<sty');
        const completions = plugin.getCompletions(document, vscode_languageserver_1.Position.create(0, 4));
        assert.ok(Array.isArray(completions && completions.items));
        assert.ok(completions.items.find((item) => item.label === 'style (lang="less")'));
    }));
    it('does not provide lang in completions for attributes', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div sty');
        const completions = plugin.getCompletions(document, vscode_languageserver_1.Position.create(0, 8));
        assert.ok(Array.isArray(completions && completions.items));
        assert.strictEqual(completions.items.find((item) => item.label === 'style (lang="less")'), undefined);
    }));
    it('does not provide rename for element being uppercase', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<Div></Div>');
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 2)), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 2), 'p'), null);
    }));
    it('does not provide rename for valid element but incorrect position #1', () => {
        const { plugin, document } = setup('<div on:click={ab => ab}>asd</div>');
        const newName = 'p';
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 16)), null);
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 5)), null);
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 26)), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 16), newName), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 5), newName), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 26), newName), null);
    });
    it('does not provide rename for valid element but incorrect position #2', () => {
        const { plugin, document } = setup('<svelte:window on:click={ab => ab} />');
        const newName = 'p';
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 33)), null);
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 36)), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 33), newName), null);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 36), newName), null);
    });
    it('provides rename for element', () => {
        const { plugin, document } = setup('<div on:click={() => {}}></div>');
        const newName = 'p';
        const pepareRenameInfo = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 1), vscode_languageserver_1.Position.create(0, 4));
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 2)), pepareRenameInfo);
        assert.deepStrictEqual(plugin.prepareRename(document, vscode_languageserver_1.Position.create(0, 28)), pepareRenameInfo);
        const renameInfo = {
            changes: {
                [document.uri]: [
                    {
                        newText: 'p',
                        range: {
                            start: { line: 0, character: 1 },
                            end: { line: 0, character: 4 }
                        }
                    },
                    {
                        newText: 'p',
                        range: {
                            start: { line: 0, character: 27 },
                            end: { line: 0, character: 30 }
                        }
                    }
                ]
            }
        };
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 2), newName), renameInfo);
        assert.deepStrictEqual(plugin.rename(document, vscode_languageserver_1.Position.create(0, 28), newName), renameInfo);
    });
    it('provides linked editing ranges', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document } = setup('<div></div>');
        const ranges = plugin.getLinkedEditingRanges(document, vscode_languageserver_1.Position.create(0, 3));
        assert.deepStrictEqual(ranges, {
            ranges: [
                { start: { line: 0, character: 1 }, end: { line: 0, character: 4 } },
                { start: { line: 0, character: 7 }, end: { line: 0, character: 10 } }
            ]
        });
    }));
});
//# sourceMappingURL=HTMLPlugin.test.js.map