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
const path_1 = require("path");
const typescript_1 = require("typescript");
const assert_1 = require("assert");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const SemanticTokensProvider_1 = require("../../../../src/plugins/typescript/features/SemanticTokensProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path_1.default.join(__dirname, '..');
describe('SemanticTokensProvider', () => {
    const tsFile = 'tokens.svelte';
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const filePath = path_1.default.join(testDir, 'testfiles', 'semantic-tokens', filename);
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const provider = new SemanticTokensProvider_1.SemanticTokensProviderImpl(lsAndTsDocResolver);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath)
        });
        return { provider, document };
    }
    it('provides semantic token', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { provider, document } = setup(tsFile);
        const { data } = (_a = (yield provider.getSemanticTokens(document))) !== null && _a !== void 0 ? _a : {
            data: []
        };
        assertResult(data, getTsExpected(/* isFull */ true));
    }));
    it('provides partial semantic token', () => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const { provider, document } = setup(tsFile);
        const { data } = (_b = (yield provider.getSemanticTokens(document, vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(9, 0))))) !== null && _b !== void 0 ? _b : {
            data: []
        };
        assertResult(data, getTsExpected(/* isFull */ false));
    }));
    it('provides semantic token for js', () => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const { provider, document } = setup('jsToken.svelte');
        const { data } = (_c = (yield provider.getSemanticTokens(document))) !== null && _c !== void 0 ? _c : {
            data: []
        };
        assertResult(data, buildExpected([
            {
                character: 4,
                line: 1,
                length: 'console'.length,
                modifiers: [4 /* defaultLibrary */],
                type: 7 /* variable */
            },
            {
                character: 12,
                line: 1,
                length: 'log'.length,
                modifiers: [4 /* defaultLibrary */],
                type: 11 /* member */
            }
        ]));
    }));
    it('can cancel semantic token before promise resolved', () => __awaiter(void 0, void 0, void 0, function* () {
        const { provider, document } = setup(tsFile);
        const cancellationTokenSource = new vscode_languageserver_1.CancellationTokenSource();
        const tokenPromise = provider.getSemanticTokens(document, undefined, cancellationTokenSource.token);
        cancellationTokenSource.cancel();
        assert_1.default.deepStrictEqual(yield tokenPromise, null);
    }));
    function buildExpected(tokenData) {
        const builder = new vscode_languageserver_1.SemanticTokensBuilder();
        for (const token of tokenData) {
            builder.push(token.line, token.character, token.length, token.type, token.modifiers.reduce((pre, next) => pre | (1 << next), 0));
        }
        const data = builder.build().data;
        return data;
    }
    function getTsExpected(full) {
        const tokenDataScript = [
            {
                line: 2,
                character: 14,
                length: 'TextContent'.length,
                type: 2 /* interface */,
                modifiers: [0 /* declaration */]
            },
            {
                line: 3,
                character: 8,
                length: 'text'.length,
                type: 9 /* property */,
                modifiers: [0 /* declaration */]
            },
            {
                line: 6,
                character: 15,
                length: 'textPromise'.length,
                type: 7 /* variable */,
                modifiers: [0 /* declaration */, 5 /* local */]
            },
            {
                line: 6,
                character: 28,
                length: 'Promise'.length,
                type: 2 /* interface */,
                modifiers: [4 /* defaultLibrary */]
            },
            {
                line: 6,
                character: 36,
                length: 'TextContent'.length,
                type: 2 /* interface */,
                modifiers: []
            },
            {
                line: 8,
                character: 19,
                length: 'blurHandler'.length,
                type: 10 /* function */,
                modifiers: [2 /* async */, 0 /* declaration */, 5 /* local */]
            }
        ];
        const tokenDataAll = [
            ...tokenDataScript,
            {
                line: 11,
                character: 8,
                length: 'textPromise'.length,
                type: 7 /* variable */,
                modifiers: [5 /* local */]
            },
            {
                line: 11,
                character: 25,
                length: 'text'.length,
                type: 6 /* parameter */,
                modifiers: [0 /* declaration */]
            },
            {
                line: 12,
                character: 23,
                length: 'blurHandler'.length,
                type: 10 /* function */,
                modifiers: [2 /* async */, 5 /* local */]
            },
            {
                line: 12,
                character: 43,
                length: 'text'.length,
                type: 6 /* parameter */,
                modifiers: []
            },
            {
                line: 12,
                character: 48,
                length: 'text'.length,
                type: 9 /* property */,
                modifiers: []
            },
            {
                line: 14,
                character: 16,
                length: 1,
                type: 6 /* parameter */,
                modifiers: [0 /* declaration */]
            },
            {
                line: 15,
                character: 5,
                length: 1,
                type: 6 /* parameter */,
                modifiers: []
            }
        ];
        return buildExpected(full ? tokenDataAll : tokenDataScript);
    }
    /**
     *  group result by tokens to better distinguish
     */
    function assertResult(actual, expected) {
        const actualGrouped = group(actual);
        const expectedGrouped = group(expected);
        assert_1.default.deepStrictEqual(actualGrouped, expectedGrouped);
    }
    function group(tokens) {
        const result = [];
        let index = 0;
        while (index < tokens.length) {
            result.push(tokens.slice(index, (index += 5)));
        }
        return result;
    }
});
//# sourceMappingURL=SemanticTokensProvider.test.js.map