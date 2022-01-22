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
const sinon_1 = require("sinon");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../src/lib/documents");
const importPackage = require("../../../src/importPackage");
const SvelteDocument_1 = require("../../../src/plugins/svelte/SvelteDocument");
const configLoader_1 = require("../../../src/lib/documents/configLoader");
describe('Svelte Document', () => {
    function getSourceCode(transpiled) {
        return `
        <p>jo</p>
        <script>${transpiled ? '\n' : ''}const a = true</script>
        <h1>Hello, world!</h1>
        <style>.bla {}</style>
        `;
    }
    function setup(config = {}) {
        sinon_1.default.stub(configLoader_1.configLoader, 'getConfig').returns(config);
        const parent = new documents_1.Document('file:///hello.svelte', getSourceCode(false));
        sinon_1.default.restore();
        const svelteDoc = new SvelteDocument_1.SvelteDocument(parent);
        return { parent, svelteDoc };
    }
    it('gets the parents text', () => {
        const { parent, svelteDoc } = setup();
        assert.strictEqual(svelteDoc.getText(), parent.getText());
    });
    describe('#transpiled (fallback)', () => {
        function setupTranspiledWithStringSourceMap() {
            return __awaiter(this, void 0, void 0, function* () {
                const stringSourceMapScript = () => ({
                    code: '',
                    map: JSON.stringify({
                        version: 3,
                        file: '',
                        names: [],
                        sources: [],
                        sourceRoot: '',
                        mappings: ''
                    })
                });
                return setupTranspiled(stringSourceMapScript);
            });
        }
        function setupTranspiledWithObjectSourceMap() {
            return __awaiter(this, void 0, void 0, function* () {
                const rawObjectSourceMapScript = () => ({
                    code: '',
                    map: {
                        version: 3,
                        file: '',
                        names: [],
                        sources: [],
                        sourceRoot: '',
                        mappings: ''
                    }
                });
                return setupTranspiled(rawObjectSourceMapScript);
            });
        }
        function setupTranspiledWithClassSourceMap() {
            return __awaiter(this, void 0, void 0, function* () {
                const rawObjectSourceMapScript = () => ({
                    code: '',
                    map: {
                        toString: () => JSON.stringify({
                            version: 3,
                            file: '',
                            names: [],
                            sources: [],
                            sourceRoot: '',
                            mappings: ''
                        })
                    }
                });
                return setupTranspiled(rawObjectSourceMapScript);
            });
        }
        function setupTranspiled(sourceMapPreProcessor) {
            return __awaiter(this, void 0, void 0, function* () {
                const { parent, svelteDoc } = setup({
                    preprocess: {
                        script: sourceMapPreProcessor
                    }
                });
                // stub svelte preprocess and getOriginalPosition
                // to fake a source mapping process with the fallback version
                sinon_1.default
                    .stub(importPackage, 'getPackageInfo')
                    .returns({ path: '', version: { full: '', major: 3, minor: 31, patch: 0 } });
                sinon_1.default.stub(importPackage, 'importSvelte').returns({
                    preprocess: (text, preprocessor) => {
                        preprocessor = Array.isArray(preprocessor) ? preprocessor : [preprocessor];
                        preprocessor.forEach((p) => { var _a; return (_a = p.script) === null || _a === void 0 ? void 0 : _a.call(p, {}); });
                        return Promise.resolve({
                            code: getSourceCode(true),
                            dependencies: [],
                            toString: () => getSourceCode(true),
                            map: null
                        });
                    },
                    walk: null,
                    VERSION: '',
                    compile: null,
                    parse: null
                });
                const transpiled = yield svelteDoc.getTranspiled();
                const scriptSourceMapper = transpiled.scriptMapper.sourceMapper;
                // hacky reset of method because mocking the SourceMap constructor is an impossible task
                scriptSourceMapper.getOriginalPosition = ({ line, character }) => ({
                    line: line - 1,
                    character
                });
                scriptSourceMapper.getGeneratedPosition = ({ line, character }) => ({
                    line: line + 1,
                    character
                });
                sinon_1.default.restore();
                return { parent, svelteDoc, transpiled };
            });
        }
        function assertCanMapBackAndForth(transpiled, generatedPosition, originalPosition) {
            assert.deepStrictEqual(transpiled.getOriginalPosition(generatedPosition), originalPosition, 'error mapping to original position');
            assert.deepStrictEqual(transpiled.getGeneratedPosition(originalPosition), generatedPosition, 'error mapping to generated position');
        }
        it('should map correctly within string valued sourcemapped script', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithStringSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(3, 2), vscode_languageserver_1.Position.create(2, 18));
        }));
        it('should map correctly within object valued sourcemapped script', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithObjectSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(3, 2), vscode_languageserver_1.Position.create(2, 18));
        }));
        it('should map correctly within class valued sourcemapped script', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithClassSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(3, 2), vscode_languageserver_1.Position.create(2, 18));
        }));
        it('should map correctly in template before script', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithStringSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(1, 1), vscode_languageserver_1.Position.create(1, 1));
        }));
        it('should map correctly in template after script', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithStringSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(4, 1), vscode_languageserver_1.Position.create(3, 1));
        }));
        it('should map correctly in style', () => __awaiter(void 0, void 0, void 0, function* () {
            const { transpiled } = yield setupTranspiledWithStringSourceMap();
            assertCanMapBackAndForth(transpiled, vscode_languageserver_1.Position.create(5, 18), vscode_languageserver_1.Position.create(4, 18));
        }));
    });
});
//# sourceMappingURL=SvelteDocument.test.js.map