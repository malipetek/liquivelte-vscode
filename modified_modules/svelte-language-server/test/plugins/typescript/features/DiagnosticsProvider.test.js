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
const path = require("path");
const typescript_1 = require("typescript");
const documents_1 = require("../../../../src/lib/documents");
const ls_config_1 = require("../../../../src/ls-config");
const DiagnosticsProvider_1 = require("../../../../src/plugins/typescript/features/DiagnosticsProvider");
const LSAndTSDocResolver_1 = require("../../../../src/plugins/typescript/LSAndTSDocResolver");
const utils_1 = require("../../../../src/utils");
const testDir = path.join(__dirname, '..', 'testfiles', 'diagnostics');
describe('DiagnosticsProvider', () => {
    function setup(filename) {
        const docManager = new documents_1.DocumentManager((textDocument) => new documents_1.Document(textDocument.uri, textDocument.text));
        const lsAndTsDocResolver = new LSAndTSDocResolver_1.LSAndTSDocResolver(docManager, [utils_1.pathToUrl(testDir)], new ls_config_1.LSConfigManager());
        const plugin = new DiagnosticsProvider_1.DiagnosticsProviderImpl(lsAndTsDocResolver);
        const filePath = path.join(testDir, filename);
        const document = docManager.openDocument({
            uri: utils_1.pathToUrl(filePath),
            text: typescript_1.default.sys.readFile(filePath) || ''
        });
        return { plugin, document, docManager, lsAndTsDocResolver };
    }
    it('notices creation and deletion of imported module', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document, lsAndTsDocResolver } = setup('unresolvedimport.svelte');
        const diagnostics1 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics1.length, 1);
        // back-and-forth-conversion normalizes slashes
        const newFilePath = utils_1.normalizePath(path.join(testDir, 'doesntexistyet.js')) || '';
        fs_1.writeFileSync(newFilePath, 'export default function foo() {}');
        assert.ok(fs_1.existsSync(newFilePath));
        yield lsAndTsDocResolver.getSnapshot(newFilePath);
        try {
            const diagnostics2 = yield plugin.getDiagnostics(document);
            assert.deepStrictEqual(diagnostics2.length, 0);
            yield lsAndTsDocResolver.deleteSnapshot(newFilePath);
        }
        finally {
            fs_1.unlinkSync(newFilePath);
        }
        const diagnostics3 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics3.length, 1);
    })).timeout(5000);
    it('notices update of imported module', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { plugin, document, lsAndTsDocResolver } = setup('diagnostics-imported-js-update.svelte');
        const newFilePath = utils_1.normalizePath(path.join(testDir, 'empty-export.ts')) || '';
        yield lsAndTsDocResolver.getSnapshot(newFilePath);
        const diagnostics1 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual((_a = diagnostics1[0]) === null || _a === void 0 ? void 0 : _a.message, "Module '\"./empty-export\"' has no exported member 'foo'.");
        yield lsAndTsDocResolver.updateExistingTsOrJsFile(newFilePath, [
            {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                text: 'export function foo() {}'
            }
        ]);
        const diagnostics2 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics2.length, 0);
        yield lsAndTsDocResolver.deleteSnapshot(newFilePath);
    })).timeout(5000);
    it('notices file changes in all services that reference that file', () => __awaiter(void 0, void 0, void 0, function* () {
        const { plugin, document, docManager, lsAndTsDocResolver } = setup('different-ts-service.svelte');
        const otherFilePath = path.join(testDir, 'different-ts-service', 'different-ts-service.svelte');
        const otherDocument = docManager.openDocument({
            uri: utils_1.pathToUrl(otherFilePath),
            text: typescript_1.default.sys.readFile(otherFilePath) || ''
        });
        // needed because tests have nasty dependencies between them. The ts service
        // is cached and knows the docs already
        const sharedFilePath = path.join(testDir, 'shared-comp.svelte');
        docManager.openDocument({
            uri: utils_1.pathToUrl(sharedFilePath),
            text: typescript_1.default.sys.readFile(sharedFilePath) || ''
        });
        const diagnostics1 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics1.length, 2);
        const diagnostics2 = yield plugin.getDiagnostics(otherDocument);
        assert.deepStrictEqual(diagnostics2.length, 2);
        docManager.updateDocument({ uri: utils_1.pathToUrl(path.join(testDir, 'shared-comp.svelte')), version: 2 }, [
            {
                range: { start: { line: 1, character: 19 }, end: { line: 1, character: 19 } },
                text: 'o'
            }
        ]);
        yield lsAndTsDocResolver.updateExistingTsOrJsFile(path.join(testDir, 'shared-ts-file.ts'), [
            {
                range: { start: { line: 0, character: 18 }, end: { line: 0, character: 18 } },
                text: 'r'
            }
        ]);
        // Wait until the LsAndTsDocResolver notifies the services of the document update
        yield new Promise((resolve) => setTimeout(resolve, 1000));
        const diagnostics3 = yield plugin.getDiagnostics(document);
        assert.deepStrictEqual(diagnostics3.length, 0);
        const diagnostics4 = yield plugin.getDiagnostics(otherDocument);
        assert.deepStrictEqual(diagnostics4.length, 0);
    })).timeout(5000);
});
//# sourceMappingURL=DiagnosticsProvider.test.js.map