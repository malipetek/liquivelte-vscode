"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoredBuildDirectories = exports.SnapshotManager = exports.GlobalSnapshotsManager = void 0;
const typescript_1 = require("typescript");
const DocumentSnapshot_1 = require("./DocumentSnapshot");
const logger_1 = require("../../logger");
const utils_1 = require("../../utils");
const events_1 = require("events");
/**
 * Every snapshot corresponds to a unique file on disk.
 * A snapshot can be part of multiple projects, but for a given file path
 * there can be only one snapshot.
 */
class GlobalSnapshotsManager {
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this.documents = new Map();
    }
    get(fileName) {
        fileName = utils_1.normalizePath(fileName);
        return this.documents.get(fileName);
    }
    set(fileName, document) {
        fileName = utils_1.normalizePath(fileName);
        const prev = this.get(fileName);
        if (prev) {
            prev.destroyFragment();
        }
        this.documents.set(fileName, document);
        this.emitter.emit('change', fileName, document);
    }
    delete(fileName) {
        fileName = utils_1.normalizePath(fileName);
        this.documents.delete(fileName);
        this.emitter.emit('change', fileName, undefined);
    }
    updateTsOrJsFile(fileName, changes) {
        fileName = utils_1.normalizePath(fileName);
        const previousSnapshot = this.get(fileName);
        if (changes) {
            if (!(previousSnapshot instanceof DocumentSnapshot_1.JSOrTSDocumentSnapshot)) {
                return;
            }
            previousSnapshot.update(changes);
            this.emitter.emit('change', fileName, previousSnapshot);
            return previousSnapshot;
        }
        else {
            const newSnapshot = DocumentSnapshot_1.DocumentSnapshot.fromNonSvelteFilePath(fileName);
            if (previousSnapshot) {
                newSnapshot.version = previousSnapshot.version + 1;
            }
            else {
                // ensure it's greater than initial version
                // so that ts server picks up the change
                newSnapshot.version += 1;
            }
            this.set(fileName, newSnapshot);
            return newSnapshot;
        }
    }
    onChange(listener) {
        this.emitter.on('change', listener);
    }
}
exports.GlobalSnapshotsManager = GlobalSnapshotsManager;
/**
 * Should only be used by `service.ts`
 */
class SnapshotManager {
    constructor(globalSnapshotsManager, projectFiles, fileSpec, workspaceRoot) {
        this.globalSnapshotsManager = globalSnapshotsManager;
        this.projectFiles = projectFiles;
        this.fileSpec = fileSpec;
        this.workspaceRoot = workspaceRoot;
        this.documents = new Map();
        this.lastLogged = new Date(new Date().getTime() - 60001);
        this.watchExtensions = [
            typescript_1.default.Extension.Dts,
            typescript_1.default.Extension.Js,
            typescript_1.default.Extension.Jsx,
            typescript_1.default.Extension.Ts,
            typescript_1.default.Extension.Tsx,
            typescript_1.default.Extension.Json
        ];
        this.globalSnapshotsManager.onChange((fileName, document) => {
            // Only delete/update snapshots, don't add new ones,
            // as they could be from another TS service and this
            // snapshot manager can't reach this file.
            // For these, instead wait on a `get` method invocation
            // and set them "manually" in the set/update methods.
            if (!document) {
                this.documents.delete(fileName);
            }
            else if (this.documents.has(fileName)) {
                this.documents.set(fileName, document);
            }
        });
    }
    updateProjectFiles() {
        const { include, exclude } = this.fileSpec;
        // Since we default to not include anything,
        //  just don't waste time on this
        if ((include === null || include === void 0 ? void 0 : include.length) === 0) {
            return;
        }
        const projectFiles = typescript_1.default.sys
            .readDirectory(this.workspaceRoot, this.watchExtensions, exclude, include)
            .map(utils_1.normalizePath);
        this.projectFiles = Array.from(new Set([...this.projectFiles, ...projectFiles]));
    }
    updateTsOrJsFile(fileName, changes) {
        const snapshot = this.globalSnapshotsManager.updateTsOrJsFile(fileName, changes);
        // This isn't duplicated logic to the listener, because this could
        // be a new snapshot which the listener wouldn't add.
        if (snapshot) {
            this.documents.set(utils_1.normalizePath(fileName), snapshot);
        }
    }
    has(fileName) {
        fileName = utils_1.normalizePath(fileName);
        return this.projectFiles.includes(fileName) || this.getFileNames().includes(fileName);
    }
    set(fileName, snapshot) {
        this.globalSnapshotsManager.set(fileName, snapshot);
        // This isn't duplicated logic to the listener, because this could
        // be a new snapshot which the listener wouldn't add.
        this.documents.set(utils_1.normalizePath(fileName), snapshot);
        this.logStatistics();
    }
    get(fileName) {
        fileName = utils_1.normalizePath(fileName);
        let snapshot = this.documents.get(fileName);
        if (!snapshot) {
            snapshot = this.globalSnapshotsManager.get(fileName);
            if (snapshot) {
                this.documents.set(fileName, snapshot);
            }
        }
        return snapshot;
    }
    delete(fileName) {
        fileName = utils_1.normalizePath(fileName);
        this.projectFiles = this.projectFiles.filter((s) => s !== fileName);
        this.globalSnapshotsManager.delete(fileName);
    }
    getFileNames() {
        return Array.from(this.documents.keys());
    }
    getProjectFileNames() {
        return [...this.projectFiles];
    }
    logStatistics() {
        const date = new Date();
        // Don't use setInterval because that will keep tests running forever
        if (date.getTime() - this.lastLogged.getTime() > 60000) {
            this.lastLogged = date;
            const projectFiles = this.getProjectFileNames();
            const allFiles = Array.from(new Set([...projectFiles, ...this.getFileNames()]));
            logger_1.Logger.log('SnapshotManager File Statistics:\n' +
                `Project files: ${projectFiles.length}\n` +
                `Svelte files: ${allFiles.filter((name) => name.endsWith('.svelte')).length}\n` +
                `From node_modules: ${allFiles.filter((name) => name.includes('node_modules')).length}\n` +
                `Total: ${allFiles.length}`);
        }
    }
}
exports.SnapshotManager = SnapshotManager;
exports.ignoredBuildDirectories = ['__sapper__', '.svelte-kit'];
//# sourceMappingURL=SnapshotManager.js.map