"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importSveltePreprocess = exports.importSvelte = exports.importPrettier = exports.getPackageInfo = exports.setIsTrusted = void 0;
const path_1 = require("path");
const logger_1 = require("./logger");
/**
 * Whether or not the current workspace can be trusted.
 * TODO rework this to a class which depends on the LsConfigManager
 * and inject that class into all places where it's needed (Document etc.)
 */
let isTrusted = true;
function setIsTrusted(_isTrusted) {
    isTrusted = _isTrusted;
}
exports.setIsTrusted = setIsTrusted;
/**
 * This function encapsulates the require call in one place
 * so we can replace its content inside rollup builds
 * so it's not transformed.
 */
function dynamicRequire(dynamicFileToRequire) {
    // prettier-ignore
    return require(dynamicFileToRequire);
}
function getPackageInfo(packageName, fromPath) {
    const paths = [__dirname];
    if (isTrusted) {
        paths.unshift(fromPath);
    }
    const packageJSONPath = require.resolve(`${packageName}/package.json`, {
        paths
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = dynamicRequire(packageJSONPath);
    const [major, minor, patch] = version.split('.');
    return {
        path: path_1.dirname(packageJSONPath),
        version: {
            full: version,
            major: Number(major),
            minor: Number(minor),
            patch: Number(patch)
        }
    };
}
exports.getPackageInfo = getPackageInfo;
function importPrettier(fromPath) {
    const pkg = getPackageInfo('prettier', fromPath);
    const main = path_1.resolve(pkg.path);
    logger_1.Logger.log('Using Prettier v' + pkg.version.full, 'from', main);
    return dynamicRequire(main);
}
exports.importPrettier = importPrettier;
function importSvelte(fromPath) {
    const pkg = getPackageInfo('svelte', fromPath);
    const main = path_1.resolve(pkg.path, 'compiler');
    logger_1.Logger.log('Using Svelte v' + pkg.version.full, 'from', main);
    return dynamicRequire(main);
}
exports.importSvelte = importSvelte;
function importSveltePreprocess(fromPath) {
    const pkg = getPackageInfo('svelte-preprocess', fromPath);
    const main = path_1.resolve(pkg.path);
    logger_1.Logger.log('Using svelte-preprocess v' + pkg.version.full, 'from', main);
    return dynamicRequire(main);
}
exports.importSveltePreprocess = importSveltePreprocess;
//# sourceMappingURL=importPackage.js.map