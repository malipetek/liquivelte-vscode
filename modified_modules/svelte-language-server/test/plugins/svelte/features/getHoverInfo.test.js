"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode_languageserver_1 = require("vscode-languageserver");
const getHoverInfo_1 = require("../../../../src/plugins/svelte/features/getHoverInfo");
const SvelteDocument_1 = require("../../../../src/plugins/svelte/SvelteDocument");
const SvelteTags_1 = require("../../../../src/plugins/svelte/features/SvelteTags");
const documents_1 = require("../../../../src/lib/documents");
const getModifierData_1 = require("../../../../src/plugins/svelte/features/getModifierData");
describe('SveltePlugin#getHoverInfo', () => {
    function expectHoverInfoFor(content, position) {
        const document = new documents_1.Document('url', content);
        const svelteDoc = new SvelteDocument_1.SvelteDocument(document);
        const hover = getHoverInfo_1.getHoverInfo(document, svelteDoc, position);
        return {
            toEqual: (tag) => assert.deepStrictEqual(hover, tag ? { contents: SvelteTags_1.documentation[tag] } : null)
        };
    }
    describe('should return null', () => {
        it('if position inside style', () => {
            expectHoverInfoFor('<style>h1{color:blue;}</style><p>test</p>', vscode_languageserver_1.Position.create(0, 10)).toEqual(null);
        });
        it('if position inside script', () => {
            expectHoverInfoFor('<script>const a = true</script><p>test</p>', vscode_languageserver_1.Position.create(0, 10)).toEqual(null);
        });
        it('if not valid content #1', () => {
            expectHoverInfoFor('{nope', vscode_languageserver_1.Position.create(0, 2)).toEqual(null);
        });
        it('if not valid content #2', () => {
            expectHoverInfoFor('not really', vscode_languageserver_1.Position.create(0, 2)).toEqual(null);
        });
        it('if not valid content #3', () => {
            expectHoverInfoFor('{#await.', vscode_languageserver_1.Position.create(0, 3)).toEqual(null);
        });
    });
    describe('should return no hover for :else', () => {
        it(' when no open tag before that', () => {
            expectHoverInfoFor('{:else}', vscode_languageserver_1.Position.create(0, 3)).toEqual(null);
        });
        it(' when only completed tag before that', () => {
            expectHoverInfoFor('{#if}{/if}{:else}', vscode_languageserver_1.Position.create(0, 15)).toEqual(null);
        });
    });
    it('should return hover for :else if opening tag before that', () => {
        expectHoverInfoFor('{#if}{:else}', vscode_languageserver_1.Position.create(0, 8)).toEqual('if');
    }),
        describe('should return hover for /', () => {
            ['if', 'each', 'await'].forEach((tag) => {
                it(`(/${tag})`, () => {
                    expectHoverInfoFor(`{/${tag}}`, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
                    expectHoverInfoFor(`{/${tag} `, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
                });
            });
        });
    describe('should return hover for #', () => {
        ['if', 'each', 'await', 'key'].forEach((tag) => {
            it(`(#${tag})`, () => {
                expectHoverInfoFor(`{#${tag}}`, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
                expectHoverInfoFor(`{#${tag} `, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
            });
        });
    });
    describe('should return hover for @', () => {
        ['debug', 'html'].forEach((tag) => {
            it(`(@${tag})`, () => {
                expectHoverInfoFor(`{@${tag}}`, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
                expectHoverInfoFor(`{@${tag} `, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag);
            });
        });
    });
    describe('should return hover for definite :', () => {
        [
            ['if', 'else if'],
            ['await', 'then'],
            ['await', 'catch']
        ].forEach((tag) => {
            it(`(:${tag[1]})`, () => {
                expectHoverInfoFor(`{:${tag[1]}}`, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag[0]);
                expectHoverInfoFor(`{:${tag[1]} `, vscode_languageserver_1.Position.create(0, 3)).toEqual(tag[0]);
            });
        });
    });
    function expectHoverInfoForEventModifier(content, position) {
        const document = new documents_1.Document('url', content);
        const svelteDoc = new SvelteDocument_1.SvelteDocument(document);
        const hover = getHoverInfo_1.getHoverInfo(document, svelteDoc, position);
        return {
            toEqual: (expectedModifier) => {
                var _a;
                const contents = (_a = getModifierData_1.getModifierData().find((modifier) => modifier.modifier === expectedModifier)) === null || _a === void 0 ? void 0 : _a.documentation;
                assert.deepStrictEqual(hover, { contents });
            }
        };
    }
    it('should return hover event modifier', () => {
        expectHoverInfoForEventModifier('<div on:click|preventDefault />', vscode_languageserver_1.Position.create(0, 15)).toEqual('preventDefault');
    });
});
//# sourceMappingURL=getHoverInfo.test.js.map