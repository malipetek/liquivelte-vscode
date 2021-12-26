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
const fs_1 = require("fs");
const path_1 = require("path");
const typescript_1 = require("typescript");
const documents_1 = require("../../../../../src/lib/documents");
const ls_config_1 = require("../../../../../src/ls-config");
const plugins_1 = require("../../../../../src/plugins");
const DiagnosticsProvider_1 = require("../../../../../src/plugins/typescript/features/DiagnosticsProvider");
const utils_1 = require("../../../../../src/utils");
function setup(workspaceDir, filePath) {
    const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
    const lsAndTsDocResolver = new plugins_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(workspaceDir)], new ls_config_1.LSConfigManager());
    const plugin = new DiagnosticsProvider_1.DiagnosticsProviderImpl(lsAndTsDocResolver);
    const document = docManager.openDocument({
        uri: utils_1.pathToUrl(filePath),
        text: typescript_1.default.sys.readFile(filePath) || ''
    });
    return { plugin, document, docManager, lsAndTsDocResolver };
}
function executeTests(dir, workspaceDir) {
    const inputFile = path_1.join(dir, 'input.svelte');
    if (fs_1.existsSync(inputFile)) {
        const _it = dir.endsWith('.only') ? it.only : it;
        _it(dir.substring(__dirname.length), () => __awaiter(this, void 0, void 0, function* () {
            const { plugin, document } = setup(workspaceDir, inputFile);
            const diagnostics = yield plugin.getDiagnostics(document);
            const expectedFile = path_1.join(dir, 'expected.json');
            if (fs_1.existsSync(expectedFile)) {
                assert.deepStrictEqual(diagnostics, JSON.parse(fs_1.readFileSync(expectedFile, 'UTF-8')));
            }
            else {
                console.info('Created expected.json for ', dir.substring(__dirname.length));
                fs_1.writeFileSync(expectedFile, JSON.stringify(diagnostics), 'UTF-8');
            }
        })).timeout(5000);
    }
    else {
        const _describe = dir.endsWith('.only') ? describe.only : describe;
        _describe(dir.substring(__dirname.length), () => {
            const subDirs = fs_1.readdirSync(dir);
            for (const subDir of subDirs) {
                if (fs_1.statSync(path_1.join(dir, subDir)).isDirectory()) {
                    executeTests(path_1.join(dir, subDir), workspaceDir);
                }
            }
        });
    }
}
describe('DiagnosticsProvider', () => {
    executeTests(path_1.join(__dirname, 'fixtures'), path_1.join(__dirname, 'fixtures'));
});
//# sourceMappingURL=index.test.js.map