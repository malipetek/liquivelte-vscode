"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalVars = void 0;
const chokidar_1 = require("chokidar");
const fs_1 = require("fs");
const utils_1 = require("../../utils");
const varRegex = /^\s*(--\w+.*?):\s*?([^;]*)/;
class GlobalVars {
    constructor() {
        this.globalVars = new Map();
    }
    watchFiles(filesToWatch) {
        if (!filesToWatch) {
            return;
        }
        if (this.fsWatcher) {
            this.fsWatcher.close();
            this.globalVars.clear();
        }
        this.fsWatcher = chokidar_1.watch(filesToWatch.split(','))
            .addListener('add', (file) => this.updateForFile(file))
            .addListener('change', (file) => {
            this.updateForFile(file);
        })
            .addListener('unlink', (file) => this.globalVars.delete(file));
    }
    updateForFile(filename) {
        // Inside a small timeout because it seems chikidar is "too fast"
        // and reading the file will then return empty content
        setTimeout(() => {
            fs_1.readFile(filename, 'utf-8', (error, contents) => {
                if (error) {
                    return;
                }
                const globalVarsForFile = contents
                    .split('\n')
                    .map((line) => line.match(varRegex))
                    .filter(utils_1.isNotNullOrUndefined)
                    .map((line) => ({ filename, name: line[1], value: line[2] }));
                this.globalVars.set(filename, globalVarsForFile);
            });
        }, 1000);
    }
    getGlobalVars() {
        return utils_1.flatten([...this.globalVars.values()]);
    }
}
exports.GlobalVars = GlobalVars;
//# sourceMappingURL=global-vars.js.map