"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const os_1 = require("os");
const vscode_languageserver_1 = require("vscode-languageserver");
const getCompletions_1 = require("../../../../src/plugins/svelte/features/getCompletions");
const SvelteDocument_1 = require("../../../../src/plugins/svelte/SvelteDocument");
const documents_1 = require("../../../../src/lib/documents");
const getModifierData_1 = require("../../../../src/plugins/svelte/features/getModifierData");
describe('SveltePlugin#getCompletions', () => {
    function expectCompletionsFor(content, position = vscode_languageserver_1.Position.create(0, content.length)) {
        const document = new documents_1.Document('url', content);
        const svelteDoc = new SvelteDocument_1.SvelteDocument(document);
        const completions = getCompletions_1.getCompletions(document, svelteDoc, position);
        return {
            toEqual: (expectedLabels) => {
                var _a;
                return assert.deepStrictEqual((_a = completions === null || completions === void 0 ? void 0 : completions.items.map((item) => item.label)) !== null && _a !== void 0 ? _a : null, expectedLabels);
            }
        };
    }
    describe('should return null', () => {
        it('if position inside style', () => {
            expectCompletionsFor('<style>h1{color:blue;}</style><p>test</p>', vscode_languageserver_1.Position.create(0, 10)).toEqual(null);
        });
        it('if position inside script', () => {
            expectCompletionsFor('<script>const a = true</script><p>test</p>', vscode_languageserver_1.Position.create(0, 10)).toEqual(null);
        });
        it('if not preceeded by valid content #1', () => {
            expectCompletionsFor('{nope').toEqual(null);
        });
        it('if not preceeded by valid content #2', () => {
            expectCompletionsFor('not really').toEqual(null);
        });
        it('if not preceeded by valid content #3', () => {
            expectCompletionsFor('{#awa.').toEqual(null);
        });
    });
    it('should return completions for #', () => {
        expectCompletionsFor('{#').toEqual(['if', 'each', 'await :then', 'await then', 'key']);
    });
    it('should return completions for @', () => {
        expectCompletionsFor('{@').toEqual(['html', 'debug']);
    });
    describe('should return no completions for :', () => {
        it(' when no open tag before that', () => {
            expectCompletionsFor('{:').toEqual(null);
        });
        it(' when only completed tag before that', () => {
            expectCompletionsFor('{#if}{/if}{:').toEqual(null);
        });
    });
    describe('should return no completions for /', () => {
        it('when no open tag before that', () => {
            expectCompletionsFor('{/').toEqual(null);
        });
        it('when only completed tag before that', () => {
            expectCompletionsFor('{#if}{/if}{/').toEqual(null);
        });
        it('when the only completed tag before it has white space before close symbol', () => {
            expectCompletionsFor('{#if}{ /if}{/').toEqual(null);
        });
    });
    describe('should return completion for :', () => {
        it('for if', () => {
            expectCompletionsFor('{#if}{:').toEqual(['else', 'else if']);
        });
        it('for each', () => {
            expectCompletionsFor('{#each}{:').toEqual(['else']);
        });
        it('for await', () => {
            expectCompletionsFor('{#await}{:').toEqual(['then', 'catch']);
        });
        it('for last open tag', () => {
            expectCompletionsFor('{#if}{/if}{#if}{#await}{:').toEqual(['then', 'catch']);
        });
    });
    describe('should return completion for /', () => {
        it('for if', () => {
            expectCompletionsFor('{#if}{/').toEqual(['if']);
        });
        it('for each', () => {
            expectCompletionsFor('{#each}{/').toEqual(['each']);
        });
        it('for await', () => {
            expectCompletionsFor('{#await}{/').toEqual(['await']);
        });
        it('for key', () => {
            expectCompletionsFor('{#key}{/').toEqual(['key']);
        });
        it('for last open tag', () => {
            expectCompletionsFor('{#if}{/if}{#if}{#await}{/').toEqual(['await']);
        });
    });
    it('should return completion for component documentation comment', () => {
        var _a;
        const content = '<!--@';
        const document = new documents_1.Document('url', content);
        const svelteDoc = new SvelteDocument_1.SvelteDocument(document);
        const completions = getCompletions_1.getCompletions(document, svelteDoc, vscode_languageserver_1.Position.create(0, content.length));
        assert.deepStrictEqual((_a = completions === null || completions === void 0 ? void 0 : completions.items) === null || _a === void 0 ? void 0 : _a[0].insertText, `component${os_1.EOL}$1${os_1.EOL}`);
    });
    function expectCompletionsForModifier(content, position = vscode_languageserver_1.Position.create(0, content.lastIndexOf('|') + 1)) {
        return expectCompletionsFor(content, position);
    }
    describe('should return completion for event modifier', () => {
        const modifierData = getModifierData_1.getModifierData();
        const allModifiers = modifierData.map((modifier) => modifier.modifier);
        it('can provides modifiers', () => {
            expectCompletionsForModifier('<div on:click| />').toEqual(allModifiers);
        });
        it('can chain modifier and does not provide duplicated modifier', () => {
            expectCompletionsForModifier('<div on:click|stopPropagation| />').toEqual(allModifiers.filter((modifier) => modifier !== 'stopPropagation'));
        });
        it("can chain modifier and does not provide modifier that can't used together", () => {
            expectCompletionsForModifier('<div on:click|preventDefault| />').toEqual(modifierData
                .filter((modifier) => {
                var _a;
                return modifier.modifier != 'preventDefault' &&
                    !((_a = modifier.modifiersInvalidWith) === null || _a === void 0 ? void 0 : _a.includes('preventDefault'));
            })
                .map((modifier) => modifier.modifier));
        });
    });
});
//# sourceMappingURL=getCompletions.test.js.map