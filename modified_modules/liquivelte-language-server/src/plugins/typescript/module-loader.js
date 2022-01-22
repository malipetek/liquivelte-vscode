"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSvelteModuleLoader = void 0;
const typescript_1 = require("typescript");
const utils_1 = require("../../utils");
const svelte_sys_1 = require("./svelte-sys");
const utils_2 = require("./utils");
/**
 * Caches resolved modules.
 */
class ModuleResolutionCache {
    constructor() {
        this.cache = new Map();
    }
    /**
     * Tries to get a cached module.
     * Careful: `undefined` can mean either there's no match found, or that the result resolved to `undefined`.
     */
    get(moduleName, containingFile) {
        return this.cache.get(this.getKey(moduleName, containingFile));
    }
    /**
     * Checks if has cached module.
     */
    has(moduleName, containingFile) {
        return this.cache.has(this.getKey(moduleName, containingFile));
    }
    /**
     * Caches resolved module (or undefined).
     */
    set(moduleName, containingFile, resolvedModule) {
        this.cache.set(this.getKey(moduleName, containingFile), resolvedModule);
    }
    /**
     * Deletes module from cache. Call this if a file was deleted.
     * @param resolvedModuleName full path of the module
     */
    delete(resolvedModuleName) {
        this.cache.forEach((val, key) => {
            if ((val === null || val === void 0 ? void 0 : val.resolvedFileName) === resolvedModuleName) {
                this.cache.delete(key);
            }
        });
    }
    /**
     * Deletes everything from cache that resolved to `undefined`
     * and which might match the path.
     */
    deleteUnresolvedResolutionsFromCache(path) {
        const fileNameWithoutEnding = utils_1.getLastPartOfPath(path).split('.').shift() || '';
        this.cache.forEach((val, key) => {
            const moduleName = key.split(':::').pop() || '';
            if (!val && moduleName.includes(fileNameWithoutEnding)) {
                this.cache.delete(key);
            }
        });
    }
    getKey(moduleName, containingFile) {
        return containingFile + ':::' + utils_2.ensureRealSvelteFilePath(moduleName);
    }
}
/**
 * Creates a module loader specifically for `.svelte` files.
 *
 * The typescript language service tries to look up other files that are referenced in the currently open svelte file.
 * For `.ts`/`.js` files this works, for `.svelte` files it does not by default.
 * Reason: The typescript language service does not know about the `.svelte` file ending,
 * so it assumes it's a normal typescript file and searches for files like `../Component.svelte.ts`, which is wrong.
 * In order to fix this, we need to wrap typescript's module resolution and reroute all `.svelte.ts` file lookups to .svelte.
 *
 * @param getSnapshot A function which returns a (in case of svelte file fully preprocessed) typescript/javascript snapshot
 * @param compilerOptions The typescript compiler options
 */
function createSvelteModuleLoader(getSnapshot, compilerOptions) {
    const svelteSys = svelte_sys_1.createSvelteSys(getSnapshot);
    const moduleCache = new ModuleResolutionCache();
    return {
        fileExists: svelteSys.fileExists,
        readFile: svelteSys.readFile,
        readDirectory: svelteSys.readDirectory,
        deleteFromModuleCache: (path) => moduleCache.delete(path),
        deleteUnresolvedResolutionsFromCache: (path) => moduleCache.deleteUnresolvedResolutionsFromCache(path),
        resolveModuleNames
    };
    function resolveModuleNames(moduleNames, containingFile) {
        return moduleNames.map((moduleName) => {
            if (moduleCache.has(moduleName, containingFile)) {
                return moduleCache.get(moduleName, containingFile);
            }
            const resolvedModule = resolveModuleName(moduleName, containingFile);
            moduleCache.set(moduleName, containingFile, resolvedModule);
            return resolvedModule;
        });
    }
    function resolveModuleName(name, containingFile) {
        // Delegate to the TS resolver first.
        // If that does not bring up anything, try the Svelte Module loader
        // which is able to deal with .svelte files.
        const tsResolvedModule = typescript_1.default.resolveModuleName(name, containingFile, compilerOptions, typescript_1.default.sys).resolvedModule;
        if (tsResolvedModule && !utils_2.isVirtualSvelteFilePath(tsResolvedModule.resolvedFileName)) {
            return tsResolvedModule;
        }
        const svelteResolvedModule = typescript_1.default.resolveModuleName(name, containingFile, compilerOptions, svelteSys).resolvedModule;
        if (!svelteResolvedModule ||
            !utils_2.isVirtualSvelteFilePath(svelteResolvedModule.resolvedFileName)) {
            return svelteResolvedModule;
        }
        const resolvedFileName = utils_2.ensureRealSvelteFilePath(svelteResolvedModule.resolvedFileName);
        const snapshot = getSnapshot(resolvedFileName);
        const resolvedSvelteModule = {
            extension: utils_2.getExtensionFromScriptKind(snapshot && snapshot.scriptKind),
            resolvedFileName,
            isExternalLibraryImport: svelteResolvedModule.isExternalLibraryImport
        };
        return resolvedSvelteModule;
    }
}
exports.createSvelteModuleLoader = createSvelteModuleLoader;
//# sourceMappingURL=module-loader.js.map