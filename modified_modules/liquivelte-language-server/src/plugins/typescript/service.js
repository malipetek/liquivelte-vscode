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
exports.getServiceForTsconfig = exports.forAllServices = exports.getService = void 0;
const path_1 = require("path");
const typescript_1 = require("typescript");
const importPackage_1 = require("../../importPackage");
const configLoader_1 = require("../../lib/documents/configLoader");
const logger_1 = require("../../logger");
const utils_1 = require("../../utils");
const DocumentSnapshot_1 = require("./DocumentSnapshot");
const module_loader_1 = require("./module-loader");
const SnapshotManager_1 = require("./SnapshotManager");
const utils_2 = require("./utils");
const maxProgramSizeForNonTsFiles = 20 * 1024 * 1024; // 20 MB
const services = new Map();
const serviceSizeMap = new Map();
function getService(path, workspaceUris, docContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const tsconfigPath = utils_2.findTsConfigPath(path, workspaceUris);
        return getServiceForTsconfig(tsconfigPath, docContext);
    });
}
exports.getService = getService;
function forAllServices(cb) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const service of services.values()) {
            cb(yield service);
        }
    });
}
exports.forAllServices = forAllServices;
/**
 * @param tsconfigPath has to be absolute
 * @param docContext
 */
function getServiceForTsconfig(tsconfigPath, docContext) {
    return __awaiter(this, void 0, void 0, function* () {
        let service;
        if (services.has(tsconfigPath)) {
            service = yield services.get(tsconfigPath);
        }
        else {
            logger_1.Logger.log('Initialize new ts service at ', tsconfigPath);
            const newService = createLanguageService(tsconfigPath, docContext);
            services.set(tsconfigPath, newService);
            service = yield newService;
        }
        return service;
    });
}
exports.getServiceForTsconfig = getServiceForTsconfig;
function createLanguageService(tsconfigPath, docContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspacePath = tsconfigPath ? path_1.dirname(tsconfigPath) : '';
        const { options: compilerOptions, fileNames: files, raw } = getParsedConfig();
        // raw is the tsconfig merged with extending config
        // see: https://github.com/microsoft/TypeScript/blob/08e4f369fbb2a5f0c30dee973618d65e6f7f09f8/src/compiler/commandLineParser.ts#L2537
        const snapshotManager = new SnapshotManager_1.SnapshotManager(docContext.globalSnapshotsManager, files, raw, workspacePath || process.cwd());
        // Load all configs within the tsconfig scope and the one above so that they are all loaded
        // by the time they need to be accessed synchronously by DocumentSnapshots to determine
        // the default language.
        yield configLoader_1.configLoader.loadConfigs(workspacePath);
        const svelteModuleLoader = module_loader_1.createSvelteModuleLoader(getSnapshot, compilerOptions);
        let svelteTsPath;
        try {
            // For when svelte2tsx/svelte-check is part of node_modules, for example VS Code extension
            svelteTsPath = path_1.dirname(require.resolve(docContext.ambientTypesSource));
        }
        catch (e) {
            // Fall back to dirname
            svelteTsPath = __dirname;
        }
        const svelteTsxFiles = [
            './svelte-shims.d.ts',
            './svelte-jsx.d.ts',
            './svelte-native-jsx.d.ts'
        ].map((f) => typescript_1.default.sys.resolvePath(path_1.resolve(svelteTsPath, f)));
        let languageServiceReducedMode = false;
        let projectVersion = 0;
        const host = {
            getCompilationSettings: () => compilerOptions,
            getScriptFileNames: () => Array.from(new Set([
                ...(languageServiceReducedMode ? [] : snapshotManager.getProjectFileNames()),
                ...snapshotManager.getFileNames(),
                ...svelteTsxFiles
            ])),
            getScriptVersion: (fileName) => getSnapshot(fileName).version.toString(),
            getScriptSnapshot: getSnapshot,
            getCurrentDirectory: () => workspacePath,
            getDefaultLibFileName: typescript_1.default.getDefaultLibFilePath,
            fileExists: svelteModuleLoader.fileExists,
            readFile: svelteModuleLoader.readFile,
            resolveModuleNames: svelteModuleLoader.resolveModuleNames,
            readDirectory: svelteModuleLoader.readDirectory,
            getDirectories: typescript_1.default.sys.getDirectories,
            useCaseSensitiveFileNames: () => typescript_1.default.sys.useCaseSensitiveFileNames,
            getScriptKind: (fileName) => getSnapshot(fileName).scriptKind,
            getProjectVersion: () => projectVersion.toString(),
            getNewLine: () => typescript_1.default.sys.newLine
        };
        let languageService = typescript_1.default.createLanguageService(host);
        const transformationConfig = {
            transformOnTemplateError: docContext.transformOnTemplateError
        };
        docContext.globalSnapshotsManager.onChange(() => {
            projectVersion++;
        });
        reduceLanguageServiceCapabilityIfFileSizeTooBig();
        return {
            tsconfigPath,
            compilerOptions,
            getService: () => languageService,
            updateSnapshot,
            deleteSnapshot,
            updateProjectFiles,
            updateTsOrJsFile,
            hasFile,
            fileBelongsToProject,
            snapshotManager
        };
        function deleteSnapshot(filePath) {
            svelteModuleLoader.deleteFromModuleCache(filePath);
            snapshotManager.delete(filePath);
        }
        function updateSnapshot(documentOrFilePath) {
            return typeof documentOrFilePath === 'string'
                ? updateSnapshotFromFilePath(documentOrFilePath)
                : updateSnapshotFromDocument(documentOrFilePath);
        }
        function updateSnapshotFromDocument(document) {
            const filePath = document.getFilePath() || '';
            const prevSnapshot = snapshotManager.get(filePath);
            if ((prevSnapshot === null || prevSnapshot === void 0 ? void 0 : prevSnapshot.version) === document.version) {
                return prevSnapshot;
            }
            if (!prevSnapshot) {
                svelteModuleLoader.deleteUnresolvedResolutionsFromCache(filePath);
            }
            const newSnapshot = DocumentSnapshot_1.DocumentSnapshot.fromDocument(document, transformationConfig);
            snapshotManager.set(filePath, newSnapshot);
            if (prevSnapshot && prevSnapshot.scriptKind !== newSnapshot.scriptKind) {
                // Restart language service as it doesn't handle script kind changes.
                languageService.dispose();
                languageService = typescript_1.default.createLanguageService(host);
            }
            return newSnapshot;
        }
        function updateSnapshotFromFilePath(filePath) {
            const prevSnapshot = snapshotManager.get(filePath);
            if (prevSnapshot) {
                return prevSnapshot;
            }
            svelteModuleLoader.deleteUnresolvedResolutionsFromCache(filePath);
            const newSnapshot = DocumentSnapshot_1.DocumentSnapshot.fromFilePath(filePath, docContext.createDocument, transformationConfig);
            snapshotManager.set(filePath, newSnapshot);
            return newSnapshot;
        }
        function getSnapshot(fileName) {
            fileName = utils_2.ensureRealSvelteFilePath(fileName);
            let doc = snapshotManager.get(fileName);
            if (doc) {
                return doc;
            }
            svelteModuleLoader.deleteUnresolvedResolutionsFromCache(fileName);
            doc = DocumentSnapshot_1.DocumentSnapshot.fromFilePath(fileName, docContext.createDocument, transformationConfig);
            snapshotManager.set(fileName, doc);
            return doc;
        }
        function updateProjectFiles() {
            projectVersion++;
            const projectFileCountBefore = snapshotManager.getProjectFileNames().length;
            snapshotManager.updateProjectFiles();
            const projectFileCountAfter = snapshotManager.getProjectFileNames().length;
            if (projectFileCountAfter <= projectFileCountBefore) {
                return;
            }
            reduceLanguageServiceCapabilityIfFileSizeTooBig();
        }
        function hasFile(filePath) {
            return snapshotManager.has(filePath);
        }
        function fileBelongsToProject(filePath) {
            filePath = utils_1.normalizePath(filePath);
            return hasFile(filePath) || getParsedConfig().fileNames.includes(filePath);
        }
        function updateTsOrJsFile(fileName, changes) {
            if (!snapshotManager.has(fileName)) {
                svelteModuleLoader.deleteUnresolvedResolutionsFromCache(fileName);
            }
            snapshotManager.updateTsOrJsFile(fileName, changes);
        }
        function getParsedConfig() {
            var _a;
            const forcedCompilerOptions = {
                allowNonTsExtensions: true,
                target: typescript_1.default.ScriptTarget.Latest,
                module: typescript_1.default.ModuleKind.ESNext,
                moduleResolution: typescript_1.default.ModuleResolutionKind.NodeJs,
                allowJs: true,
                noEmit: true,
                declaration: false,
                skipLibCheck: true,
                // these are needed to handle the results of svelte2tsx preprocessing:
                jsx: typescript_1.default.JsxEmit.Preserve
            };
            // always let ts parse config to get default compilerOption
            let configJson = (tsconfigPath && typescript_1.default.readConfigFile(tsconfigPath, typescript_1.default.sys.readFile).config) ||
                getDefaultJsConfig();
            // Only default exclude when no extends for now
            if (!configJson.extends) {
                configJson = Object.assign({
                    exclude: getDefaultExclude()
                }, configJson);
            }
            const parsedConfig = typescript_1.default.parseJsonConfigFileContent(configJson, typescript_1.default.sys, workspacePath, forcedCompilerOptions, tsconfigPath, undefined, [
                {
                    extension: 'svelte',
                    isMixedContent: true,
                    // Deferred was added in a later TS version, fall back to tsx
                    // If Deferred exists, this means that all Svelte files are included
                    // in parsedConfig.fileNames
                    scriptKind: (_a = typescript_1.default.ScriptKind.Deferred) !== null && _a !== void 0 ? _a : typescript_1.default.ScriptKind.TSX
                }
            ]);
            const compilerOptions = Object.assign(Object.assign({}, parsedConfig.options), forcedCompilerOptions);
            // detect which JSX namespace to use (svelte | svelteNative) if not specified or not compatible
            if (!compilerOptions.jsxFactory || !compilerOptions.jsxFactory.startsWith('svelte')) {
                //default to regular svelte, this causes the usage of the "svelte.JSX" namespace
                compilerOptions.jsxFactory = 'svelte.createElement';
                //override if we detect svelte-native
                if (workspacePath) {
                    try {
                        const svelteNativePkgInfo = importPackage_1.getPackageInfo('svelte-native', workspacePath);
                        if (svelteNativePkgInfo.path) {
                            compilerOptions.jsxFactory = 'svelteNative.createElement';
                        }
                    }
                    catch (e) {
                        //we stay regular svelte
                    }
                }
            }
            return Object.assign(Object.assign({}, parsedConfig), { fileNames: parsedConfig.fileNames.map(utils_1.normalizePath), options: compilerOptions });
        }
        /**
         * This should only be used when there's no jsconfig/tsconfig at all
         */
        function getDefaultJsConfig() {
            return {
                compilerOptions: {
                    maxNodeModuleJsDepth: 2,
                    allowSyntheticDefaultImports: true
                },
                // Necessary to not flood the initial files
                // with potentially completely unrelated .ts/.js files:
                include: []
            };
        }
        function getDefaultExclude() {
            return ['node_modules', ...SnapshotManager_1.ignoredBuildDirectories];
        }
        /**
         * Disable usage of project files.
         * running language service in a reduced mode for
         * large projects with improperly excluded tsconfig.
         */
        function reduceLanguageServiceCapabilityIfFileSizeTooBig() {
            var _a;
            if (exceedsTotalSizeLimitForNonTsFiles(compilerOptions, tsconfigPath, snapshotManager)) {
                languageService.cleanupSemanticCache();
                languageServiceReducedMode = true;
                (_a = docContext.notifyExceedSizeLimit) === null || _a === void 0 ? void 0 : _a.call(docContext);
            }
        }
    });
}
/**
 * adopted from https://github.com/microsoft/TypeScript/blob/3c8e45b304b8572094c5d7fbb9cd768dbf6417c0/src/server/editorServices.ts#L1955
 */
function exceedsTotalSizeLimitForNonTsFiles(compilerOptions, tsconfigPath, snapshotManager) {
    var _a, _b, _c;
    if (compilerOptions.disableSizeLimit) {
        return false;
    }
    let availableSpace = maxProgramSizeForNonTsFiles;
    serviceSizeMap.set(tsconfigPath, 0);
    serviceSizeMap.forEach((size) => {
        availableSpace -= size;
    });
    let totalNonTsFileSize = 0;
    const fileNames = snapshotManager.getProjectFileNames();
    for (const fileName of fileNames) {
        if (utils_2.hasTsExtensions(fileName)) {
            continue;
        }
        totalNonTsFileSize += (_c = (_b = (_a = typescript_1.default.sys).getFileSize) === null || _b === void 0 ? void 0 : _b.call(_a, fileName)) !== null && _c !== void 0 ? _c : 0;
        if (totalNonTsFileSize > availableSpace) {
            const top5LargestFiles = fileNames
                .filter((name) => !utils_2.hasTsExtensions(name))
                .map((name) => { var _a, _b, _c; return ({ name, size: (_c = (_b = (_a = typescript_1.default.sys).getFileSize) === null || _b === void 0 ? void 0 : _b.call(_a, name)) !== null && _c !== void 0 ? _c : 0 }); })
                .sort((a, b) => b.size - a.size)
                .slice(0, 5);
            logger_1.Logger.log(`Non TS file size exceeded limit (${totalNonTsFileSize}). ` +
                `Largest files: ${top5LargestFiles
                    .map((file) => `${file.name}:${file.size}`)
                    .join(', ')}`);
            return true;
        }
    }
    serviceSizeMap.set(tsconfigPath, totalNonTsFileSize);
    return false;
}
//# sourceMappingURL=service.js.map