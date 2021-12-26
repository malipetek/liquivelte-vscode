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
exports.returnObjectIfHasKeys = exports.possiblyComponent = exports.getIndent = exports.filterAsync = exports.modifyLines = exports.getRegExpMatches = exports.regexIndexOf = exports.regexLastIndexOf = exports.debounceThrottle = exports.debounceSameArg = exports.isNotNullOrUndefined = exports.isBeforeOrEqualToPosition = exports.moveRangeStartToEndIfNecessary = exports.swapRangeStartEndIfNecessary = exports.isRangeStartAfterEnd = exports.isInRange = exports.passMap = exports.flatten = exports.getLastPartOfPath = exports.normalizeUri = exports.normalizePath = exports.pathToUrl = exports.urlToPath = exports.clamp = exports.and = exports.or = exports.not = void 0;
const vscode_uri_1 = require("vscode-uri");
function not(predicate) {
    return (x) => !predicate(x);
}
exports.not = not;
function or(...predicates) {
    return (x) => predicates.some((predicate) => predicate(x));
}
exports.or = or;
function and(...predicates) {
    return (x) => predicates.every((predicate) => predicate(x));
}
exports.and = and;
function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
}
exports.clamp = clamp;
function urlToPath(stringUrl) {
    const url = vscode_uri_1.URI.parse(stringUrl);
    if (url.scheme !== 'file') {
        return null;
    }
    return url.fsPath.replace(/\\/g, '/');
}
exports.urlToPath = urlToPath;
function pathToUrl(path) {
    return vscode_uri_1.URI.file(path).toString();
}
exports.pathToUrl = pathToUrl;
/**
 * Some paths (on windows) start with a upper case driver letter, some don't.
 * This is normalized here.
 */
function normalizePath(path) {
    return vscode_uri_1.URI.file(path).fsPath.replace(/\\/g, '/');
}
exports.normalizePath = normalizePath;
/**
 * URIs coming from the client could be encoded in a different
 * way than expected / than the internal services create them.
 * This normalizes them to be the same as the internally generated ones.
 */
function normalizeUri(uri) {
    return vscode_uri_1.URI.parse(uri).toString();
}
exports.normalizeUri = normalizeUri;
/**
 * Given a path like foo/bar or foo/bar.svelte , returns its last path
 * (bar or bar.svelte in this example).
 */
function getLastPartOfPath(path) {
    return path.replace(/\\/g, '/').split('/').pop() || '';
}
exports.getLastPartOfPath = getLastPartOfPath;
function flatten(arr) {
    return arr.reduce((all, item) => (Array.isArray(item) ? [...all, ...item] : [...all, item]), []);
}
exports.flatten = flatten;
/**
 * Map or keep original (passthrough) if the mapper returns undefined.
 */
function passMap(array, mapper) {
    return array.map((x) => {
        const mapped = mapper(x);
        return mapped === undefined ? x : mapped;
    });
}
exports.passMap = passMap;
function isInRange(range, positionToTest) {
    return (isBeforeOrEqualToPosition(range.end, positionToTest) &&
        isBeforeOrEqualToPosition(positionToTest, range.start));
}
exports.isInRange = isInRange;
function isRangeStartAfterEnd(range) {
    return (range.end.line < range.start.line ||
        (range.end.line === range.start.line && range.end.character < range.start.character));
}
exports.isRangeStartAfterEnd = isRangeStartAfterEnd;
function swapRangeStartEndIfNecessary(range) {
    if (isRangeStartAfterEnd(range)) {
        const start = range.start;
        range.start = range.end;
        range.end = start;
    }
    return range;
}
exports.swapRangeStartEndIfNecessary = swapRangeStartEndIfNecessary;
function moveRangeStartToEndIfNecessary(range) {
    if (isRangeStartAfterEnd(range)) {
        range.start = range.end;
    }
    return range;
}
exports.moveRangeStartToEndIfNecessary = moveRangeStartToEndIfNecessary;
function isBeforeOrEqualToPosition(position, positionToTest) {
    return (positionToTest.line < position.line ||
        (positionToTest.line === position.line && positionToTest.character <= position.character));
}
exports.isBeforeOrEqualToPosition = isBeforeOrEqualToPosition;
function isNotNullOrUndefined(val) {
    return val !== undefined && val !== null;
}
exports.isNotNullOrUndefined = isNotNullOrUndefined;
/**
 * Debounces a function but cancels previous invocation only if
 * a second function determines it should.
 *
 * @param fn The function with it's argument
 * @param determineIfSame The function which determines if the previous invocation should be canceld or not
 * @param miliseconds Number of miliseconds to debounce
 */
function debounceSameArg(fn, shouldCancelPrevious, miliseconds) {
    let timeout;
    let prevArg;
    return (arg) => {
        if (shouldCancelPrevious(arg, prevArg)) {
            clearTimeout(timeout);
        }
        prevArg = arg;
        timeout = setTimeout(() => {
            fn(arg);
            prevArg = undefined;
        }, miliseconds);
    };
}
exports.debounceSameArg = debounceSameArg;
/**
 * Debounces a function but also waits at minimum the specified number of miliseconds until
 * the next invocation. This avoids needless calls when a synchronous call (like diagnostics)
 * took too long and the whole timeout of the next call was eaten up already.
 *
 * @param fn The function with it's argument
 * @param miliseconds Number of miliseconds to debounce/throttle
 */
function debounceThrottle(fn, miliseconds) {
    let timeout;
    let lastInvocation = Date.now() - miliseconds;
    function maybeCall(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (Date.now() - lastInvocation < miliseconds) {
                maybeCall(...args);
                return;
            }
            fn(...args);
            lastInvocation = Date.now();
        }, miliseconds);
    }
    return maybeCall;
}
exports.debounceThrottle = debounceThrottle;
/**
 * Like str.lastIndexOf, but for regular expressions. Note that you need to provide the g-flag to your RegExp!
 */
function regexLastIndexOf(text, regex, endPos) {
    if (endPos === undefined) {
        endPos = text.length;
    }
    else if (endPos < 0) {
        endPos = 0;
    }
    const stringToWorkWith = text.substring(0, endPos + 1);
    let lastIndexOf = -1;
    let result = null;
    while ((result = regex.exec(stringToWorkWith)) !== null) {
        lastIndexOf = result.index;
    }
    return lastIndexOf;
}
exports.regexLastIndexOf = regexLastIndexOf;
/**
 * Like str.indexOf, but for regular expressions.
 */
function regexIndexOf(text, regex, startPos) {
    var _a;
    if (startPos === undefined || startPos < 0) {
        startPos = 0;
    }
    const stringToWorkWith = text.substring(startPos);
    const result = regex.exec(stringToWorkWith);
    return (_a = result === null || result === void 0 ? void 0 : result.index) !== null && _a !== void 0 ? _a : -1;
}
exports.regexIndexOf = regexIndexOf;
/**
 * Get all matches of a regexp.
 */
function getRegExpMatches(regex, str) {
    const matches = [];
    let match;
    while ((match = regex.exec(str))) {
        matches.push(match);
    }
    return matches;
}
exports.getRegExpMatches = getRegExpMatches;
/**
 * Function to modify each line of a text, preserving the line break style (`\n` or `\r\n`)
 */
function modifyLines(text, replacementFn) {
    let idx = 0;
    return text
        .split('\r\n')
        .map((l1) => l1
        .split('\n')
        .map((line) => replacementFn(line, idx++))
        .join('\n'))
        .join('\r\n');
}
exports.modifyLines = modifyLines;
/**
 * Like array.filter, but asynchronous
 */
function filterAsync(array, predicate) {
    return __awaiter(this, void 0, void 0, function* () {
        const fail = Symbol();
        return (yield Promise.all(array.map((item, idx) => __awaiter(this, void 0, void 0, function* () { return ((yield predicate(item, idx)) ? item : fail); })))).filter((i) => i !== fail);
    });
}
exports.filterAsync = filterAsync;
function getIndent(text) {
    var _a, _b;
    return (_b = (_a = /^[ |\t]+/.exec(text)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '';
}
exports.getIndent = getIndent;
/**
 *
 * The html language service is case insensitive, and would provide
 * hover/ completion info for Svelte components like `Option` which have
 * the same name like a html tag.
 *
 * Also, svelte directives like action and event modifier only work
 * with element not component
 */
function possiblyComponent(node) {
    var _a;
    return !!((_a = node.tag) === null || _a === void 0 ? void 0 : _a[0].match(/[A-Z]/));
}
exports.possiblyComponent = possiblyComponent;
/**
 * If the object if it has entries, else undefined
 */
function returnObjectIfHasKeys(obj) {
    if (Object.keys(obj || {}).length > 0) {
        return obj;
    }
}
exports.returnObjectIfHasKeys = returnObjectIfHasKeys;
//# sourceMappingURL=utils.js.map