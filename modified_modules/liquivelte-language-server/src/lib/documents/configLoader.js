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
exports.configLoader = exports.ConfigLoader = void 0;
const logger_1 = require("../../logger");
const importPackage_1 = require("../../importPackage");
const fast_glob_1 = require("fast-glob");
const path_1 = require("path");
const fs_1 = require("fs");
const url_1 = require("url");
const DEFAULT_OPTIONS = {
    dev: true
};
const NO_GENERATE = {
    generate: false
};
/**
 * This function encapsulates the import call in a way
 * that TypeScript does not transpile `import()`.
 * https://github.com/microsoft/TypeScript/issues/43329
 */
const _dynamicImport = new Function('modulePath', 'return import(modulePath)');
/**
 * Loads svelte.config.{js,cjs,mjs} files. Provides both a synchronous and asynchronous
 * interface to get a config file because snapshots need access to it synchronously.
 * This means that another instance (the ts service host on startup) should make
 * sure that all config files are loaded before snapshots are retrieved.
 * Asynchronousity is needed because we use the dynamic `import()` statement.
 */
class ConfigLoader {
    constructor(globSync, fs, path, dynamicImport) {
        this.globSync = globSync;
        this.fs = fs;
        this.path = path;
        this.dynamicImport = dynamicImport;
        this.configFiles = new Map();
        this.configFilesAsync = new Map();
        this.filePathToConfigPath = new Map();
        this.disabled = false;
    }
    /**
     * Enable/disable loading of configs (for security reasons for example)
     */
    setDisabled(disabled) {
        this.disabled = disabled;
    }
    /**
     * Tries to load all `svelte.config.js` files below given directory
     * and the first one found inside/above that directory.
     *
     * @param directory Directory where to load the configs from
     */
    loadConfigs(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log('Trying to load configs for', directory);
            try {
                const pathResults = this.globSync('**/svelte.config.{js,cjs,mjs}', {
                    cwd: directory,
                    ignore: ['**/node_modules/**']
                });
                const someConfigIsImmediateFileInDirectory = pathResults.length > 0 && pathResults.some((res) => !this.path.dirname(res));
                if (!someConfigIsImmediateFileInDirectory) {
                    const configPathUpwards = this.searchConfigPathUpwards(directory);
                    if (configPathUpwards) {
                        pathResults.push(this.path.relative(directory, configPathUpwards));
                    }
                }
                if (pathResults.length === 0) {
                    this.addFallbackConfig(directory);
                    return;
                }
                const promises = pathResults
                    .map((pathResult) => this.path.join(directory, pathResult))
                    .filter((pathResult) => {
                    const config = this.configFiles.get(pathResult);
                    return !config || config.loadConfigError;
                })
                    .map((pathResult) => __awaiter(this, void 0, void 0, function* () {
                    yield this.loadAndCacheConfig(pathResult, directory);
                }));
                yield Promise.all(promises);
            }
            catch (e) {
                logger_1.Logger.error(e);
            }
        });
    }
    addFallbackConfig(directory) {
        const fallback = this.useFallbackPreprocessor(directory, false);
        const path = this.path.join(directory, 'svelte.config.js');
        this.configFilesAsync.set(path, Promise.resolve(fallback));
        this.configFiles.set(path, fallback);
    }
    searchConfigPathUpwards(path) {
        let currentDir = path;
        let nextDir = this.path.dirname(path);
        while (currentDir !== nextDir) {
            const tryFindConfigPath = (ending) => {
                const path = this.path.join(currentDir, `svelte.config.${ending}`);
                return this.fs.existsSync(path) ? path : undefined;
            };
            const configPath = tryFindConfigPath('js') || tryFindConfigPath('cjs') || tryFindConfigPath('mjs');
            if (configPath) {
                return configPath;
            }
            currentDir = nextDir;
            nextDir = this.path.dirname(currentDir);
        }
    }
    loadAndCacheConfig(configPath, directory) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadingConfig = this.configFilesAsync.get(configPath);
            if (loadingConfig) {
                yield loadingConfig;
            }
            else {
                const newConfig = this.loadConfig(configPath, directory);
                this.configFilesAsync.set(configPath, newConfig);
                this.configFiles.set(configPath, yield newConfig);
            }
        });
    }
    loadConfig(configPath, directory) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let config = this.disabled
                    ? {}
                    : (_a = (yield this.dynamicImport(url_1.pathToFileURL(configPath)))) === null || _a === void 0 ? void 0 : _a.default;
                if (!config) {
                    throw new Error('Missing exports in the config. Make sure to include "export default config" or "module.exports = config"');
                }
                config = Object.assign(Object.assign({}, config), { compilerOptions: Object.assign(Object.assign(Object.assign({}, DEFAULT_OPTIONS), config.compilerOptions), NO_GENERATE) });
                logger_1.Logger.log('Loaded config at ', configPath);
                return config;
            }
            catch (err) {
                logger_1.Logger.error('Error while loading config at ', configPath);
                logger_1.Logger.error(err);
                const config = Object.assign(Object.assign({}, this.useFallbackPreprocessor(directory, true)), { compilerOptions: Object.assign(Object.assign({}, DEFAULT_OPTIONS), NO_GENERATE), loadConfigError: err });
                return config;
            }
        });
    }
    /**
     * Returns config associated to file. If no config is found, the file
     * was called in a context where no config file search was done before,
     * which can happen
     * - if TS intellisense is turned off and the search did not run on tsconfig init
     * - if the file was opened not through the TS service crawl, but through the LSP
     *
     * @param file
     */
    getConfig(file) {
        const cached = this.filePathToConfigPath.get(file);
        if (cached) {
            return this.configFiles.get(cached);
        }
        let currentDir = file;
        let nextDir = this.path.dirname(file);
        while (currentDir !== nextDir) {
            currentDir = nextDir;
            const config = this.tryGetConfig(file, currentDir, 'js') ||
                this.tryGetConfig(file, currentDir, 'cjs') ||
                this.tryGetConfig(file, currentDir, 'mjs');
            if (config) {
                return config;
            }
            nextDir = this.path.dirname(currentDir);
        }
    }
    /**
     * Like `getConfig`, but will search for a config above if no config found.
     */
    awaitConfig(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getConfig(file);
            if (config) {
                return config;
            }
            const fileDirectory = this.path.dirname(file);
            const configPath = this.searchConfigPathUpwards(fileDirectory);
            if (configPath) {
                yield this.loadAndCacheConfig(configPath, fileDirectory);
            }
            else {
                this.addFallbackConfig(fileDirectory);
            }
            return this.getConfig(file);
        });
    }
    tryGetConfig(file, fromDirectory, configFileEnding) {
        const path = this.path.join(fromDirectory, `svelte.config.${configFileEnding}`);
        const config = this.configFiles.get(path);
        if (config) {
            this.filePathToConfigPath.set(file, path);
            return config;
        }
    }
    useFallbackPreprocessor(path, foundConfig) {
        logger_1.Logger.log((foundConfig
            ? 'Found svelte.config.js but there was an error loading it. '
            : 'No svelte.config.js found. ') +
            'Using https://github.com/sveltejs/svelte-preprocess as fallback');
        const sveltePreprocess = importPackage_1.importSveltePreprocess(path);
        return {
            preprocess: sveltePreprocess({
                // 4.x does not have transpileOnly anymore, but if the user has version 3.x
                // in his repo, that one is loaded instead, for which we still need this.
                typescript: {
                    transpileOnly: true,
                    compilerOptions: { sourceMap: true, inlineSourceMap: false }
                }
            })
        };
    }
}
exports.ConfigLoader = ConfigLoader;
exports.configLoader = new ConfigLoader(fast_glob_1.default.sync, fs_1.default, path_1.default, _dynamicImport);
//# sourceMappingURL=configLoader.js.map