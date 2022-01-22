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
exports.LSAndTSDocResolver = void 0;
const typescript_1 = require("typescript");
const utils_1 = require("../../utils");
const service_1 = require("./service");
const SnapshotManager_1 = require("./SnapshotManager");
class LSAndTSDocResolver {
    /**
     *
     * @param docManager
     * @param workspaceUris
     * @param configManager
     * @param notifyExceedSizeLimit
     * @param isSvelteCheck True, if used in the context of svelte-check
     * @param tsconfigPath This should only be set via svelte-check. Makes sure all documents are resolved to that tsconfig. Has to be absolute.
     */
    constructor(docManager, workspaceUris, configManager, notifyExceedSizeLimit, isSvelteCheck = false, tsconfigPath) {
        this.docManager = docManager;
        this.workspaceUris = workspaceUris;
        this.configManager = configManager;
        this.notifyExceedSizeLimit = notifyExceedSizeLimit;
        this.isSvelteCheck = isSvelteCheck;
        this.tsconfigPath = tsconfigPath;
        /**
         * Create a svelte document -> should only be invoked with svelte files.
         */
        this.createDocument = (fileName, content) => {
            const uri = utils_1.pathToUrl(fileName);
            const document = this.docManager.openDocument({
                text: content,
                uri
            });
            this.docManager.lockDocument(uri);
            return document;
        };
        this.globalSnapshotsManager = new SnapshotManager_1.GlobalSnapshotsManager();
        const handleDocumentChange = (document) => {
            // This refreshes the document in the ts language service
            this.getSnapshot(document);
        };
        docManager.on('documentChange', utils_1.debounceSameArg(handleDocumentChange, (newDoc, prevDoc) => newDoc.uri === (prevDoc === null || prevDoc === void 0 ? void 0 : prevDoc.uri), 1000));
        // New files would cause typescript to rebuild its type-checker.
        // Open it immediately to reduce rebuilds in the startup
        // where multiple files and their dependencies
        // being loaded in a short period of times
        docManager.on('documentOpen', handleDocumentChange);
    }
    get lsDocumentContext() {
        return {
            ambientTypesSource: this.isSvelteCheck ? 'svelte-check' : 'svelte2tsx',
            createDocument: this.createDocument,
            transformOnTemplateError: !this.isSvelteCheck,
            globalSnapshotsManager: this.globalSnapshotsManager,
            notifyExceedSizeLimit: this.notifyExceedSizeLimit
        };
    }
    getLSForPath(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getTSService(path)).getService();
        });
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getLSForPath(document.getFilePath() || '');
            const tsDoc = yield this.getSnapshot(document);
            const userPreferences = this.getUserPreferences(tsDoc.scriptKind);
            return { tsDoc, lang, userPreferences };
        });
    }
    getSnapshot(pathOrDoc) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = typeof pathOrDoc === 'string' ? pathOrDoc : pathOrDoc.getFilePath() || '';
            const tsService = yield this.getTSService(filePath);
            return tsService.updateSnapshot(pathOrDoc);
        });
    }
    /**
     * Updates snapshot path in all existing ts services and retrieves snapshot
     */
    updateSnapshotPath(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteSnapshot(oldPath);
            return this.getSnapshot(newPath);
        });
    }
    /**
     * Deletes snapshot in all existing ts services
     */
    deleteSnapshot(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield service_1.forAllServices((service) => service.deleteSnapshot(filePath));
            this.docManager.releaseDocument(utils_1.pathToUrl(filePath));
        });
    }
    /**
     * Updates project files in all existing ts services
     */
    updateProjectFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            yield service_1.forAllServices((service) => service.updateProjectFiles());
        });
    }
    /**
     * Updates file in all ts services where it exists
     */
    updateExistingTsOrJsFile(path, changes) {
        return __awaiter(this, void 0, void 0, function* () {
            path = utils_1.normalizePath(path);
            // Only update once because all snapshots are shared between
            // services. Since we don't have a current version of TS/JS
            // files, the operation wouldn't be idempotent.
            let didUpdate = false;
            yield service_1.forAllServices((service) => {
                if (service.hasFile(path) && !didUpdate) {
                    didUpdate = true;
                    service.updateTsOrJsFile(path, changes);
                }
            });
        });
    }
    /**
     * @internal Public for tests only
     */
    getSnapshotManager(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getTSService(filePath)).snapshotManager;
        });
    }
    getTSService(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tsconfigPath) {
                return service_1.getServiceForTsconfig(this.tsconfigPath, this.lsDocumentContext);
            }
            if (!filePath) {
                throw new Error('Cannot call getTSService without filePath and without tsconfigPath');
            }
            return service_1.getService(filePath, this.workspaceUris, this.lsDocumentContext);
        });
    }
    getUserPreferences(scriptKind) {
        const configLang = scriptKind === typescript_1.default.ScriptKind.TS || scriptKind === typescript_1.default.ScriptKind.TSX
            ? 'typescript'
            : 'javascript';
        return this.configManager.getTsUserPreferences(configLang);
    }
}
exports.LSAndTSDocResolver = LSAndTSDocResolver;
//# sourceMappingURL=LSAndTSDocResolver.js.map