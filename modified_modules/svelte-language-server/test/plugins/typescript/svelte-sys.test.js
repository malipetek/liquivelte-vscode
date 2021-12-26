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
const typescript_1 = require("typescript");
const svelte_sys_1 = require("../../../src/plugins/typescript/svelte-sys");
describe('Svelte Sys', () => {
    afterEach(() => {
        sinon_1.default.restore();
    });
    function setupLoader() {
        const tsFile = 'const a = "ts file";';
        const svelteFile = 'const a = "svelte file";';
        const fileExistsStub = sinon_1.default.stub().returns(true);
        const getSnapshotStub = sinon_1.default.stub().callsFake((path) => ({
            getText: () => (path.endsWith('.svelte.ts') ? svelteFile : tsFile),
            getLength: () => path.endsWith('.svelte.ts') ? svelteFile.length : tsFile.length
        }));
        sinon_1.default.replace(typescript_1.default.sys, 'fileExists', fileExistsStub);
        const loader = svelte_sys_1.createSvelteSys(getSnapshotStub);
        return {
            tsFile,
            svelteFile,
            fileExistsStub,
            getSnapshotStub,
            loader
        };
    }
    describe('#fileExists', () => {
        it('should leave files with no .svelte.ts-ending as is', () => __awaiter(void 0, void 0, void 0, function* () {
            const { loader, fileExistsStub } = setupLoader();
            loader.fileExists('../file.ts');
            assert.strictEqual(fileExistsStub.getCall(0).args[0], '../file.ts');
        }));
        it('should convert .svelte.ts-endings', () => __awaiter(void 0, void 0, void 0, function* () {
            const { loader, fileExistsStub } = setupLoader();
            loader.fileExists('../file.svelte.ts');
            assert.strictEqual(fileExistsStub.getCall(0).args[0], '../file.svelte');
        }));
    });
    describe('#readFile', () => {
        it('should invoke getSnapshot for ts/js files', () => __awaiter(void 0, void 0, void 0, function* () {
            const { loader, getSnapshotStub, tsFile } = setupLoader();
            const code = loader.readFile('../file.ts');
            assert.strictEqual(getSnapshotStub.called, true);
            assert.strictEqual(code, tsFile);
        }));
        it('should invoke getSnapshot for svelte files', () => __awaiter(void 0, void 0, void 0, function* () {
            const { loader, getSnapshotStub, svelteFile } = setupLoader();
            const code = loader.readFile('../file.svelte.ts');
            assert.strictEqual(getSnapshotStub.called, true);
            assert.strictEqual(code, svelteFile);
        }));
    });
});
//# sourceMappingURL=svelte-sys.test.js.map