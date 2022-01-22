"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/utils");
const vscode_languageserver_1 = require("vscode-languageserver");
const assert = require("assert");
describe('utils', () => {
    describe('#isBeforeOrEqualToPosition', () => {
        it('is before position (line, character lower)', () => {
            const result = utils_1.isBeforeOrEqualToPosition(vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(0, 0));
            assert.equal(result, true);
        });
        it('is before position (line lower, character higher)', () => {
            const result = utils_1.isBeforeOrEqualToPosition(vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(0, 2));
            assert.equal(result, true);
        });
        it('is equal to position', () => {
            const result = utils_1.isBeforeOrEqualToPosition(vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(1, 1));
            assert.equal(result, true);
        });
        it('is after position (line, character higher)', () => {
            const result = utils_1.isBeforeOrEqualToPosition(vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(2, 2));
            assert.equal(result, false);
        });
        it('is after position (line lower, character higher)', () => {
            const result = utils_1.isBeforeOrEqualToPosition(vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(2, 0));
            assert.equal(result, false);
        });
    });
    describe('#regexLastIndexOf', () => {
        it('should work #1', () => {
            assert.equal(utils_1.regexLastIndexOf('1 2 3', /\s/g), 3);
        });
        it('should work #2', () => {
            assert.equal(utils_1.regexLastIndexOf('1_2:- 3', /\W/g), 5);
        });
        it('should work #3', () => {
            assert.equal(utils_1.regexLastIndexOf('<bla blubb={() => hello', /[\W\s]/g), 17);
        });
    });
    describe('#modifyLines', () => {
        it('should work', () => {
            assert.equal(utils_1.modifyLines('a\nb\r\nc\nd', (line) => 1 + line), '1a\n1b\r\n1c\n1d');
        });
        it('should pass correct line numbers', () => {
            const idxs = [];
            utils_1.modifyLines('a\nb\r\nc\nd', (_, idx) => {
                idxs.push(idx);
                return _;
            });
            assert.deepStrictEqual(idxs, [0, 1, 2, 3]);
        });
    });
});
//# sourceMappingURL=utils.test.js.map