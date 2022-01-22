"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../src/plugins/typescript/utils");
const typescript_1 = require("typescript");
const assert = require("assert");
describe('TypeScriptPlugin utils', () => {
    describe('#getTsCheckComment', () => {
        const tsCheckComment = `// @ts-check${typescript_1.default.sys.newLine}`;
        const tsNocheckComment = `// @ts-nocheck${typescript_1.default.sys.newLine}`;
        it('should not return if ts-check is after non-comment-code', () => {
            assert.deepStrictEqual(utils_1.getTsCheckComment(`qwd
            // @ts-check`), undefined);
        });
        it('should return @ts-check', () => {
            assert.deepStrictEqual(utils_1.getTsCheckComment(`
            // @ts-check`), tsCheckComment);
        });
        it('should return @ts-nocheck', () => {
            assert.deepStrictEqual(utils_1.getTsCheckComment(`
            // @ts-nocheck`), tsNocheckComment);
        });
        it('should return if ts-check is after some comments', () => {
            assert.deepStrictEqual(utils_1.getTsCheckComment(`
            // hello
            
            ///
            // @ts-check`), tsCheckComment);
        });
        it('should not return if there are comments but without ts-check', () => {
            assert.deepStrictEqual(utils_1.getTsCheckComment(`
            // nope
            // almost@ts-check
            // @ts-almostcheck
            ///
            `), undefined);
        });
    });
});
//# sourceMappingURL=utils.test.js.map