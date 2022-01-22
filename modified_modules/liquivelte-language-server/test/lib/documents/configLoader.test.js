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
const configLoader_1 = require("../../../src/lib/documents/configLoader");
const path_1 = require("path");
const url_1 = require("url");
const assert_1 = require("assert");
const sinon_1 = require("sinon");
describe('ConfigLoader', () => {
    function configFrom(path) {
        return {
            compilerOptions: {
                dev: true,
                generate: false
            },
            preprocess: url_1.pathToFileURL(path).toString()
        };
    }
    function normalizePath(filePath) {
        return path_1.default.join(...filePath.split('/'));
    }
    function assertFindsConfig(configLoader, filePath, configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            filePath = normalizePath(filePath);
            configPath = normalizePath(configPath);
            assert_1.default.deepStrictEqual(configLoader.getConfig(filePath), configFrom(configPath));
            assert_1.default.deepStrictEqual(yield configLoader.awaitConfig(filePath), configFrom(configPath));
        });
    }
    it('should load all config files below and the one inside/above given directory', () => __awaiter(void 0, void 0, void 0, function* () {
        const configLoader = new configLoader_1.ConfigLoader((() => ['svelte.config.js', 'below/svelte.config.js']), { existsSync: () => true }, path_1.default, (module) => Promise.resolve({ default: { preprocess: module.toString() } }));
        yield configLoader.loadConfigs(normalizePath('/some/path'));
        yield assertFindsConfig(configLoader, '/some/path/comp.svelte', '/some/path/svelte.config.js');
        yield assertFindsConfig(configLoader, '/some/path/aside/comp.svelte', '/some/path/svelte.config.js');
        yield assertFindsConfig(configLoader, '/some/path/below/comp.svelte', '/some/path/below/svelte.config.js');
        yield assertFindsConfig(configLoader, '/some/path/below/further/comp.svelte', '/some/path/below/svelte.config.js');
    }));
    it('finds first above if none found inside/below directory', () => __awaiter(void 0, void 0, void 0, function* () {
        const configLoader = new configLoader_1.ConfigLoader(() => [], {
            existsSync: (p) => typeof p === 'string' && p.endsWith(path_1.default.join('some', 'svelte.config.js'))
        }, path_1.default, (module) => Promise.resolve({ default: { preprocess: module.toString() } }));
        yield configLoader.loadConfigs(normalizePath('/some/path'));
        yield assertFindsConfig(configLoader, '/some/path/comp.svelte', '/some/svelte.config.js');
    }));
    it('adds fallback if no config found', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const configLoader = new configLoader_1.ConfigLoader(() => [], { existsSync: () => false }, path_1.default, (module) => Promise.resolve({ default: { preprocess: module.toString() } }));
        yield configLoader.loadConfigs(normalizePath('/some/path'));
        assert_1.default.deepStrictEqual(
        // Can't do the equal-check directly, instead check if it's the expected object props
        // of svelte-preprocess
        Object.keys(((_a = configLoader.getConfig(normalizePath('/some/path/comp.svelte'))) === null || _a === void 0 ? void 0 : _a.preprocess) || {}).sort(), ['defaultLanguages', 'markup', 'script', 'style'].sort());
    }));
    it('will not load config multiple times if config loading started in parallel', () => __awaiter(void 0, void 0, void 0, function* () {
        let firstGlobCall = true;
        let nrImportCalls = 0;
        const configLoader = new configLoader_1.ConfigLoader((() => {
            if (firstGlobCall) {
                firstGlobCall = false;
                return ['svelte.config.js'];
            }
            else {
                return [];
            }
        }), {
            existsSync: (p) => typeof p === 'string' &&
                p.endsWith(path_1.default.join('some', 'path', 'svelte.config.js'))
        }, path_1.default, (module) => {
            nrImportCalls++;
            return new Promise((resolve) => {
                setTimeout(() => resolve({ default: { preprocess: module.toString() } }), 500);
            });
        });
        yield Promise.all([
            configLoader.loadConfigs(normalizePath('/some/path')),
            configLoader.loadConfigs(normalizePath('/some/path/sub')),
            configLoader.awaitConfig(normalizePath('/some/path/file.svelte'))
        ]);
        yield assertFindsConfig(configLoader, '/some/path/comp.svelte', '/some/path/svelte.config.js');
        yield assertFindsConfig(configLoader, '/some/path/sub/comp.svelte', '/some/path/svelte.config.js');
        assert_1.default.deepStrictEqual(nrImportCalls, 1);
    }));
    it('can deal with missing config', () => {
        const configLoader = new configLoader_1.ConfigLoader(() => [], { existsSync: () => false }, path_1.default, () => Promise.resolve('unimportant'));
        assert_1.default.deepStrictEqual(configLoader.getConfig(normalizePath('/some/file.svelte')), undefined);
    });
    it('should await config', () => __awaiter(void 0, void 0, void 0, function* () {
        const configLoader = new configLoader_1.ConfigLoader(() => [], { existsSync: () => true }, path_1.default, (module) => Promise.resolve({ default: { preprocess: module.toString() } }));
        assert_1.default.deepStrictEqual(yield configLoader.awaitConfig(normalizePath('some/file.svelte')), configFrom(normalizePath('some/svelte.config.js')));
    }));
    it('should not load config when disabled', () => __awaiter(void 0, void 0, void 0, function* () {
        const moduleLoader = sinon_1.spy();
        const configLoader = new configLoader_1.ConfigLoader(() => [], { existsSync: () => true }, path_1.default, moduleLoader);
        configLoader.setDisabled(true);
        yield configLoader.awaitConfig(normalizePath('some/file.svelte'));
        assert_1.default.deepStrictEqual(moduleLoader.notCalled, true);
    }));
});
//# sourceMappingURL=configLoader.test.js.map