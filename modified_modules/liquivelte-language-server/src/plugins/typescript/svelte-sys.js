"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSvelteSys = void 0;
const typescript_1 = require("typescript");
const utils_1 = require("./utils");
/**
 * This should only be accessed by TS svelte module resolution.
 */
function createSvelteSys(getSnapshot) {
    const svelteSys = Object.assign(Object.assign({}, typescript_1.default.sys), { fileExists(path) {
            return typescript_1.default.sys.fileExists(utils_1.ensureRealSvelteFilePath(path));
        },
        readFile(path) {
            const snapshot = getSnapshot(path);
            return snapshot.getText(0, snapshot.getLength());
        },
        readDirectory(path, extensions, exclude, include, depth) {
            const extensionsWithSvelte = (extensions !== null && extensions !== void 0 ? extensions : []).concat('.svelte');
            return typescript_1.default.sys.readDirectory(path, extensionsWithSvelte, exclude, include, depth);
        } });
    if (typescript_1.default.sys.realpath) {
        const realpath = typescript_1.default.sys.realpath;
        svelteSys.realpath = function (path) {
            if (utils_1.isVirtualSvelteFilePath(path)) {
                return realpath(utils_1.toRealSvelteFilePath(path)) + '.ts';
            }
            return realpath(path);
        };
    }
    return svelteSys;
}
exports.createSvelteSys = createSvelteSys;
//# sourceMappingURL=svelte-sys.js.map