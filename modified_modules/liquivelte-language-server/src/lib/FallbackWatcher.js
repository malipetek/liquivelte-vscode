"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackWatcher = void 0;
const chokidar_1 = require("chokidar");
const lodash_1 = require("lodash");
const path_1 = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const utils_1 = require("../utils");
const DELAY = 50;
class FallbackWatcher {
    constructor(glob, workspacePaths) {
        this.callbacks = [];
        this.undeliveredFileEvents = [];
        this.scheduleTrigger = lodash_1.debounce(() => {
            const para = {
                changes: this.undeliveredFileEvents
            };
            this.undeliveredFileEvents = [];
            this.callbacks.forEach((callback) => callback(para));
        }, DELAY);
        const gitOrNodeModules = /\.git|node_modules/;
        this.watcher = chokidar_1.watch(workspacePaths.map((workspacePath) => path_1.join(workspacePath, glob)), {
            ignored: (path) => gitOrNodeModules.test(path) &&
                // Handle Sapper's alias mapping
                !path.includes('src/node_modules') &&
                !path.includes('src\\node_modules'),
            // typescript would scan the project files on init.
            // We only need to know what got updated.
            ignoreInitial: true,
            ignorePermissionErrors: true
        });
        this.watcher
            .on('add', (path) => this.onFSEvent(path, vscode_languageserver_1.FileChangeType.Created))
            .on('unlink', (path) => this.onFSEvent(path, vscode_languageserver_1.FileChangeType.Deleted))
            .on('change', (path) => this.onFSEvent(path, vscode_languageserver_1.FileChangeType.Changed));
    }
    convert(path, type) {
        return {
            type,
            uri: utils_1.pathToUrl(path)
        };
    }
    onFSEvent(path, type) {
        const fileEvent = this.convert(path, type);
        this.undeliveredFileEvents.push(fileEvent);
        this.scheduleTrigger();
    }
    onDidChangeWatchedFiles(callback) {
        this.callbacks.push(callback);
    }
    dispose() {
        this.watcher.close();
    }
}
exports.FallbackWatcher = FallbackWatcher;
//# sourceMappingURL=FallbackWatcher.js.map