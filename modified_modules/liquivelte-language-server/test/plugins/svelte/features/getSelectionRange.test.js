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
const documents_1 = require("../../../../src/lib/documents");
const getSelectionRanges_1 = require("../../../../src/plugins/svelte/features/getSelectionRanges");
const SvelteDocument_1 = require("../../../../src/plugins/svelte/SvelteDocument");
describe('SveltePlugin#getSelectionRange', () => {
    const CURSOR = '|';
    function expectToEqual(contentWithCursor, expected) {
        return __awaiter(this, void 0, void 0, function* () {
            const svelteDoc = new SvelteDocument_1.SvelteDocument(new documents_1.Document('url', contentWithCursor.replace(CURSOR, '')));
            const selectionRange = yield getSelectionRanges_1.getSelectionRange(svelteDoc, vscode_languageserver_1.Position.create(0, contentWithCursor.indexOf(CURSOR)));
            assert.deepStrictEqual(selectionRange, expected);
        });
    }
    it('should return null for style and script', () => __awaiter(void 0, void 0, void 0, function* () {
        yield expectToEqual('<style>|</style>', null);
        yield expectToEqual('<script>|</script>', null);
    }));
    it('get selection range for element and attribute', () => {
        return expectToEqual('<h1 title="foo|"></h1>', {
            parent: {
                parent: {
                    parent: undefined,
                    range: {
                        start: {
                            line: 0,
                            character: 0
                        },
                        end: {
                            line: 0,
                            character: 21
                        }
                    }
                },
                range: {
                    start: {
                        line: 0,
                        character: 4
                    },
                    end: {
                        line: 0,
                        character: 15
                    }
                }
            },
            range: {
                start: {
                    line: 0,
                    character: 11
                },
                end: {
                    line: 0,
                    character: 14
                }
            }
        });
    });
    it('get selection range for svelte blocks', () => {
        return expectToEqual('{#if a > 1}|foo{/if}', {
            parent: {
                parent: undefined,
                // if block
                range: {
                    start: {
                        line: 0,
                        character: 0
                    },
                    end: {
                        line: 0,
                        character: 19
                    }
                }
            },
            // text
            range: {
                start: {
                    line: 0,
                    character: 11
                },
                end: {
                    line: 0,
                    character: 14
                }
            }
        });
    });
});
//# sourceMappingURL=getSelectionRange.test.js.map