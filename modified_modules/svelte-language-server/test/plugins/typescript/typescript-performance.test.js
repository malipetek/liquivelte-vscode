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
const path = require("path");
const perf_hooks_1 = require("perf_hooks");
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../src/lib/documents");
const ls_config_1 = require("../../../src/ls-config");
const plugins_1 = require("../../../src/plugins");
const utils_1 = require("../../../src/utils");
describe('TypeScript Plugin Performance Tests', () => {
    function setup(filename) {
        const docManager = new documents_1.DocumentManager(() => document);
        const testDir = path.join(__dirname, 'testfiles');
        const filePath = path.join(testDir, filename);
        const uri = utils_1.pathToUrl(filePath);
        const document = new documents_1.Document(uri, typescript_1.default.sys.readFile(filePath) || '');
        const pluginManager = new ls_config_1.LSConfigManager();
        const plugin = new plugins_1.TypeScriptPlugin(pluginManager, new plugins_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], pluginManager));
        docManager.openDocument({ uri, text: document.getText() });
        const append = (newText) => docManager.updateDocument({ uri, version: 1 }, [
            { range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(9, 0), vscode_languageserver_1.Position.create(9, 0)), text: newText }
        ]);
        const prepend = (newText) => docManager.updateDocument({ uri, version: 1 }, [
            { range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(1, 0), vscode_languageserver_1.Position.create(1, 0)), text: newText }
        ]);
        return { plugin, document, append, prepend };
    }
    it('should be fast enough', () => __awaiter(void 0, void 0, void 0, function* () {
        const { document, plugin, append, prepend } = setup('performance.svelte');
        const start = perf_hooks_1.performance.now();
        for (let i = 0; i < 100; i++) {
            const position = vscode_languageserver_1.Position.create(Math.floor(i / 2) + 1, 15);
            yield plugin.doHover(document, position);
            yield plugin.getDiagnostics(document);
            yield plugin.findReferences(document, position, {
                includeDeclaration: true
            });
            yield plugin.getDocumentSymbols(document);
            yield plugin.getSemanticTokens(document);
            yield plugin.prepareRename(document, position);
            if (i % 2) {
                prepend('function asd() {}\n');
            }
            else {
                append('function asd() {}\n');
            }
        }
        const end = perf_hooks_1.performance.now();
        console.log(`Performance test took ${end - start}ms`);
    })).timeout(15000);
});
//# sourceMappingURL=typescript-performance.test.js.map