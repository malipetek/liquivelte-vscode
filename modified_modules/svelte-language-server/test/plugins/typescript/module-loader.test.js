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
const svS = require("../../../src/plugins/typescript/svelte-sys");
const module_loader_1 = require("../../../src/plugins/typescript/module-loader");
describe('createSvelteModuleLoader', () => {
    afterEach(() => {
        sinon_1.default.restore();
    });
    function setup(resolvedModule) {
        const getSvelteSnapshotStub = sinon_1.default
            .stub()
            .returns({ scriptKind: typescript_1.default.ScriptKind.JSX });
        const resolveStub = sinon_1.default.stub().returns({
            resolvedModule
        });
        sinon_1.default.replace(typescript_1.default, 'resolveModuleName', resolveStub);
        const svelteSys = 'svelteSys';
        sinon_1.default.stub(svS, 'createSvelteSys').returns(svelteSys);
        const compilerOptions = { strict: true, paths: { '/@/*': [] } };
        const moduleResolver = module_loader_1.createSvelteModuleLoader(getSvelteSnapshotStub, compilerOptions);
        return {
            getSvelteSnapshotStub,
            resolveStub,
            compilerOptions,
            moduleResolver,
            svelteSys
        };
    }
    function lastCall(stub) {
        return stub.getCall(stub.getCalls().length - 1);
    }
    it('uses tsSys for normal files', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Ts,
            resolvedFileName: 'filename.ts'
        };
        const { resolveStub, moduleResolver, compilerOptions } = setup(resolvedModule);
        const result = moduleResolver.resolveModuleNames(['./normal.ts'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [resolvedModule]);
        assert.deepStrictEqual(lastCall(resolveStub).args, [
            './normal.ts',
            'C:/somerepo/somefile.svelte',
            compilerOptions,
            typescript_1.default.sys
        ]);
    }));
    it('uses tsSys for normal files part of TS aliases', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Ts,
            resolvedFileName: 'filename.ts'
        };
        const { resolveStub, moduleResolver, compilerOptions } = setup(resolvedModule);
        const result = moduleResolver.resolveModuleNames(['/@/normal'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [resolvedModule]);
        assert.deepStrictEqual(lastCall(resolveStub).args, [
            '/@/normal',
            'C:/somerepo/somefile.svelte',
            compilerOptions,
            typescript_1.default.sys
        ]);
    }));
    it('uses tsSys for svelte.d.ts files', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Dts,
            resolvedFileName: 'filename.d.ts'
        };
        const { resolveStub, moduleResolver, compilerOptions } = setup(resolvedModule);
        const result = moduleResolver.resolveModuleNames(['./normal.ts'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [resolvedModule]);
        assert.deepStrictEqual(lastCall(resolveStub).args, [
            './normal.ts',
            'C:/somerepo/somefile.svelte',
            compilerOptions,
            typescript_1.default.sys
        ]);
    }));
    it('uses svelte module loader for virtual svelte files', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Ts,
            resolvedFileName: 'filename.svelte.ts'
        };
        const { resolveStub, svelteSys, moduleResolver, compilerOptions, getSvelteSnapshotStub } = setup(resolvedModule);
        const result = moduleResolver.resolveModuleNames(['./svelte.svelte'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [
            {
                extension: typescript_1.default.Extension.Jsx,
                resolvedFileName: 'filename.svelte',
                isExternalLibraryImport: undefined
            }
        ]);
        assert.deepStrictEqual(lastCall(resolveStub).args, [
            './svelte.svelte',
            'C:/somerepo/somefile.svelte',
            compilerOptions,
            svelteSys
        ]);
        assert.deepStrictEqual(lastCall(getSvelteSnapshotStub).args, ['filename.svelte']);
    }));
    it('uses svelte module loader for virtual svelte files with TS path aliases', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Ts,
            resolvedFileName: 'filename.svelte.ts'
        };
        const { resolveStub, svelteSys, moduleResolver, compilerOptions, getSvelteSnapshotStub } = setup(resolvedModule);
        const result = moduleResolver.resolveModuleNames(['/@/svelte.svelte'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [
            {
                extension: typescript_1.default.Extension.Jsx,
                resolvedFileName: 'filename.svelte',
                isExternalLibraryImport: undefined
            }
        ]);
        assert.deepStrictEqual(lastCall(resolveStub).args, [
            '/@/svelte.svelte',
            'C:/somerepo/somefile.svelte',
            compilerOptions,
            svelteSys
        ]);
        assert.deepStrictEqual(lastCall(getSvelteSnapshotStub).args, ['filename.svelte']);
    }));
    it('uses cache if module was already resolved before', () => __awaiter(void 0, void 0, void 0, function* () {
        const resolvedModule = {
            extension: typescript_1.default.Extension.Ts,
            resolvedFileName: 'filename.ts'
        };
        const { resolveStub, moduleResolver } = setup(resolvedModule);
        // first call
        moduleResolver.resolveModuleNames(['./normal.ts'], 'C:/somerepo/somefile.svelte');
        // second call, which should be from cache
        const result = moduleResolver.resolveModuleNames(['./normal.ts'], 'C:/somerepo/somefile.svelte');
        assert.deepStrictEqual(result, [resolvedModule]);
        assert.deepStrictEqual(resolveStub.callCount, 1);
    }));
});
//# sourceMappingURL=module-loader.test.js.map