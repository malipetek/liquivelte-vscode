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
exports.getDiagnostics = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const logger_1 = require("../../../logger");
const utils_1 = require("../../../utils");
const SvelteDocument_1 = require("../SvelteDocument");
/**
 * Returns diagnostics from the svelte compiler.
 * Also tries to return errors at correct position if transpilation/preprocessing fails.
 */
function getDiagnostics(document, svelteDoc, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield svelteDoc.config;
        if (config === null || config === void 0 ? void 0 : config.loadConfigError) {
            return getConfigLoadErrorDiagnostics(config.loadConfigError);
        }
        try {
            return yield tryGetDiagnostics(document, svelteDoc, settings);
        }
        catch (error) {
            return getPreprocessErrorDiagnostics(document, error);
        }
    });
}
exports.getDiagnostics = getDiagnostics;
/**
 * Try to transpile and compile the svelte file and return diagnostics.
 */
function tryGetDiagnostics(document, svelteDoc, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const transpiled = yield svelteDoc.getTranspiled();
        try {
            const res = yield svelteDoc.getCompiled();
            return (res.stats.warnings || res.warnings || [])
                .filter((warning) => settings[warning.code] !== 'ignore')
                .map((warning) => {
                const start = warning.start || { line: 1, column: 0 };
                const end = warning.end || start;
                return {
                    range: vscode_languageserver_1.Range.create(start.line - 1, start.column, end.line - 1, end.column),
                    message: warning.message,
                    severity: settings[warning.code] === 'error'
                        ? vscode_languageserver_1.DiagnosticSeverity.Error
                        : vscode_languageserver_1.DiagnosticSeverity.Warning,
                    source: 'svelte',
                    code: warning.code
                };
            })
                .map((diag) => documents_1.mapObjWithRangeToOriginal(transpiled, diag))
                .map((diag) => adjustMappings(diag, document))
                .filter((diag) => isNoFalsePositive(diag, document));
        }
        catch (err) {
            return (yield createParserErrorDiagnostic(err, document))
                .map((diag) => documents_1.mapObjWithRangeToOriginal(transpiled, diag))
                .map((diag) => adjustMappings(diag, document));
        }
    });
}
/**
 * Try to infer a nice diagnostic error message from the compilation error.
 */
function createParserErrorDiagnostic(error, document) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = error.start || { line: 1, column: 0 };
        const end = error.end || start;
        const diagnostic = {
            range: vscode_languageserver_1.Range.create(start.line - 1, start.column, end.line - 1, end.column),
            message: error.message,
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            source: 'svelte',
            code: error.code
        };
        if (diagnostic.message.includes('expected')) {
            const isInStyle = documents_1.isInTag(diagnostic.range.start, document.styleInfo);
            const isInScript = documents_1.isInTag(diagnostic.range.start, document.scriptInfo || document.moduleScriptInfo);
            if (isInStyle || isInScript) {
                diagnostic.message +=
                    '\n\nIf you expect this syntax to work, here are some suggestions: ';
                if (isInScript) {
                    diagnostic.message +=
                        '\nIf you use typescript with `svelte-preprocess`, did you add `lang="ts"` to your `script` tag? ';
                }
                else {
                    diagnostic.message +=
                        '\nIf you use less/SCSS with `svelte-preprocess`, did you add `lang="scss"`/`lang="less"` to your `style` tag? ' +
                            scssNodeRuntimeHint;
                }
                diagnostic.message +=
                    '\nDid you setup a `svelte.config.js`? ' +
                        '\nSee https://github.com/sveltejs/language-tools/tree/master/docs#using-with-preprocessors for more info.';
            }
        }
        return [diagnostic];
    });
}
/**
 * Try to infer a nice diagnostic error message from the transpilation error.
 */
function getPreprocessErrorDiagnostics(document, error) {
    logger_1.Logger.error('Preprocessing failed');
    logger_1.Logger.error(error);
    if (document.styleInfo && error.__source === SvelteDocument_1.TranspileErrorSource.Style) {
        return getStyleErrorDiagnostics(error, document);
    }
    if ((document.scriptInfo || document.moduleScriptInfo) &&
        error.__source === SvelteDocument_1.TranspileErrorSource.Script) {
        return getScriptErrorDiagnostics(error, document);
    }
    return getOtherErrorDiagnostics(error);
}
function getConfigLoadErrorDiagnostics(error) {
    return [
        {
            message: 'Error in svelte.config.js\n\n' + error,
            range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(0, 5)),
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            source: 'svelte'
        }
    ];
}
/**
 * Try to infer a nice diagnostic error message from the transpilation error.
 */
function getStyleErrorDiagnostics(error, document) {
    // Error could be from another file that was mixed into the Svelte file as part of preprocessing.
    // Some preprocessors set the file property from which we can infer that
    const isErrorFromOtherFile = typeof (error === null || error === void 0 ? void 0 : error.file) === 'string' &&
        utils_1.getLastPartOfPath(error.file) !== utils_1.getLastPartOfPath(document.getFilePath() || '');
    return [
        {
            message: getStyleErrorMessage(),
            range: getStyleErrorRange(),
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            source: 'svelte(style)'
        }
    ];
    function getStyleErrorMessage() {
        if (isSveltePreprocessCannotFindModulesError(error)) {
            const hint = error.message.includes('node-sass') ? scssNodeRuntimeHint : '';
            return getErrorMessage(error.message, 'style', hint);
        }
        const msg = error.formatted /* sass error messages have this */ ||
            error.message ||
            'Style error. Transpilation failed.';
        return isErrorFromOtherFile ? 'Error in referenced file\n\n' + msg : msg;
    }
    function getStyleErrorRange() {
        var _a, _b;
        const lineOffset = ((_a = document.styleInfo) === null || _a === void 0 ? void 0 : _a.startPos.line) || 0;
        const position = !isErrorFromOtherFile &&
            // Some preprocessors like sass or less return error objects with these attributes.
            // Use it to display message at better position.
            typeof (error === null || error === void 0 ? void 0 : error.column) === 'number' &&
            typeof (error === null || error === void 0 ? void 0 : error.line) === 'number'
            ? vscode_languageserver_1.Position.create(lineOffset + error.line - 1, error.column)
            : ((_b = document.styleInfo) === null || _b === void 0 ? void 0 : _b.startPos) || vscode_languageserver_1.Position.create(0, 0);
        return vscode_languageserver_1.Range.create(position, position);
    }
}
/**
 * Try to infer a nice diagnostic error message from the transpilation error.
 */
function getScriptErrorDiagnostics(error, document) {
    return [
        {
            message: getScriptErrorMessage(),
            range: getScriptErrorRange(),
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            source: 'svelte(script)'
        }
    ];
    function getScriptErrorMessage() {
        if (isSveltePreprocessCannotFindModulesError(error)) {
            return getErrorMessage(error.message, 'script');
        }
        return error.message || 'Script error. Transpilation failed.';
    }
    function getScriptErrorRange() {
        var _a, _b;
        const position = ((_a = document.scriptInfo) === null || _a === void 0 ? void 0 : _a.startPos) ||
            ((_b = document.moduleScriptInfo) === null || _b === void 0 ? void 0 : _b.startPos) ||
            vscode_languageserver_1.Position.create(0, 0);
        return vscode_languageserver_1.Range.create(position, position);
    }
}
/**
 * Try to infer a nice diagnostic error message from the transpilation error.
 */
function getOtherErrorDiagnostics(error) {
    return [
        {
            message: getOtherErrorMessage(),
            range: vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(0, 5)),
            severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
            source: 'svelte'
        }
    ];
    function getOtherErrorMessage() {
        if (isSveltePreprocessCannotFindModulesError(error)) {
            return getErrorMessage(error.message, 'it');
        }
        return error.message || 'Error. Transpilation failed.';
    }
}
/**
 * Preprocessing could fail if packages cannot be resolved.
 * A warning about a broken svelte.configs.js/preprocessor setup should be added then.
 */
function isSveltePreprocessCannotFindModulesError(error) {
    return error instanceof Error && error.message.startsWith('Cannot find any of modules');
}
function getErrorMessage(error, source, hint = '') {
    return (error +
        '\n\nThe file cannot be parsed because ' +
        source +
        " requires a preprocessor that doesn't seem to be setup or failed during setup. " +
        'Did you setup a `svelte.config.js`? ' +
        hint +
        '\n\nSee https://github.com/sveltejs/language-tools/tree/master/docs#using-with-preprocessors for more info.');
}
function isNoFalsePositive(diag, doc) {
    if (diag.code !== 'unused-export-let') {
        return true;
    }
    // TypeScript transpiles `export enum A` and `export namespace A` to `export var A`,
    // which the compiler will warn about.
    // Silence this edge case. We extract the property from the message and don't use the position
    // because that position could be wrong when source mapping trips up.
    const unusedExportName = diag.message.substring(diag.message.indexOf("'") + 1, diag.message.lastIndexOf("'"));
    const hasExportedEnumWithThatName = new RegExp(`\\bexport\\s+?(enum|namespace)\\s+?${unusedExportName}\\b`).test(doc.getText());
    return !hasExportedEnumWithThatName;
}
/**
 * Some mappings might be invalid. Try to catch these cases here.
 */
function adjustMappings(diag, doc) {
    if (diag.range.start.character < 0) {
        diag.range.start.character = 0;
    }
    if (diag.range.end.character < 0) {
        diag.range.end.character = 0;
    }
    if (diag.range.start.line < 0) {
        diag.range.start = { line: 0, character: 0 };
    }
    if (diag.range.end.line < 0) {
        diag.range.end = { line: 0, character: 0 };
    }
    diag.range = utils_1.moveRangeStartToEndIfNecessary(diag.range);
    if (diag.code === 'css-unused-selector' &&
        doc.styleInfo &&
        !documents_1.isInTag(diag.range.start, doc.styleInfo)) {
        diag.range.start = doc.styleInfo.startPos;
        diag.range.end = diag.range.start;
    }
    return diag;
}
const scssNodeRuntimeHint = 'If you use SCSS, it may be necessary to add the path to your NODE runtime to the setting `svelte.language-server.runtime`, or use `sass` instead of `node-sass`. ';
//# sourceMappingURL=getDiagnostics.js.map