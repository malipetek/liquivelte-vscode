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
exports.SvelteSnapshotFragment = exports.JSOrTSDocumentSnapshot = exports.SvelteDocumentSnapshot = exports.DocumentSnapshot = exports.INITIAL_VERSION = void 0;
const source_map_1 = require("source-map");
const svelte2tsx_1 = require("svelte2tsx");
const typescript_1 = require("typescript");
const documents_1 = require("../../lib/documents");
const utils_1 = require("../../utils");
const DocumentMapper_1 = require("./DocumentMapper");
const utils_2 = require("./utils");
/**
 * Initial version of snapshots.
 */
exports.INITIAL_VERSION = 0;
var DocumentSnapshot;
(function (DocumentSnapshot) {
    /**
     * Returns a svelte snapshot from a svelte document.
     * @param document the svelte document
     * @param options options that apply to the svelte document
     */
    function fromDocument(document, options) {
        const { tsxMap, text, exportedNames, parserError, nrPrependedLines, scriptKind } = preprocessSvelteFile(document, options);
        return new SvelteDocumentSnapshot(document, parserError, scriptKind, text, nrPrependedLines, exportedNames, tsxMap);
    }
    DocumentSnapshot.fromDocument = fromDocument;
    /**
     * Returns a svelte or ts/js snapshot from a file path, depending on the file contents.
     * @param filePath path to the js/ts/svelte file
     * @param createDocument function that is used to create a document in case it's a Svelte file
     * @param options options that apply in case it's a svelte file
     */
    function fromFilePath(filePath, createDocument, options) {
        if (utils_2.isSvelteFilePath(filePath)) {
            return DocumentSnapshot.fromSvelteFilePath(filePath, createDocument, options);
        }
        else {
            return DocumentSnapshot.fromNonSvelteFilePath(filePath);
        }
    }
    DocumentSnapshot.fromFilePath = fromFilePath;
    /**
     * Returns a ts/js snapshot from a file path.
     * @param filePath path to the js/ts file
     * @param options options that apply in case it's a svelte file
     */
    function fromNonSvelteFilePath(filePath) {
        var _a;
        const originalText = (_a = typescript_1.default.sys.readFile(filePath)) !== null && _a !== void 0 ? _a : '';
        return new JSOrTSDocumentSnapshot(exports.INITIAL_VERSION, filePath, originalText);
    }
    DocumentSnapshot.fromNonSvelteFilePath = fromNonSvelteFilePath;
    /**
     * Returns a svelte snapshot from a file path.
     * @param filePath path to the svelte file
     * @param createDocument function that is used to create a document
     * @param options options that apply in case it's a svelte file
     */
    function fromSvelteFilePath(filePath, createDocument, options) {
        var _a;
        const originalText = (_a = typescript_1.default.sys.readFile(filePath)) !== null && _a !== void 0 ? _a : '';
        return fromDocument(createDocument(filePath, originalText), options);
    }
    DocumentSnapshot.fromSvelteFilePath = fromSvelteFilePath;
})(DocumentSnapshot = exports.DocumentSnapshot || (exports.DocumentSnapshot = {}));
/**
 * Tries to preprocess the svelte document and convert the contents into better analyzable js/ts(x) content.
 */
function preprocessSvelteFile(document, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    let tsxMap;
    let parserError = null;
    let nrPrependedLines = 0;
    let text = document.getText();
    let exportedNames = { has: () => false };
    const scriptKind = [
        utils_2.getScriptKindFromAttributes((_b = (_a = document.scriptInfo) === null || _a === void 0 ? void 0 : _a.attributes) !== null && _b !== void 0 ? _b : {}),
        utils_2.getScriptKindFromAttributes((_d = (_c = document.moduleScriptInfo) === null || _c === void 0 ? void 0 : _c.attributes) !== null && _d !== void 0 ? _d : {})
    ].includes(typescript_1.default.ScriptKind.TSX)
        ? typescript_1.default.ScriptKind.TSX
        : typescript_1.default.ScriptKind.JSX;
    try {
        const tsx = svelte2tsx_1.svelte2tsx(text, {
            filename: (_e = document.getFilePath()) !== null && _e !== void 0 ? _e : undefined,
            isTsFile: scriptKind === typescript_1.default.ScriptKind.TSX,
            emitOnTemplateError: options.transformOnTemplateError,
            namespace: (_g = (_f = document.config) === null || _f === void 0 ? void 0 : _f.compilerOptions) === null || _g === void 0 ? void 0 : _g.namespace,
            accessors: (_k = (_j = (_h = document.config) === null || _h === void 0 ? void 0 : _h.compilerOptions) === null || _j === void 0 ? void 0 : _j.accessors) !== null && _k !== void 0 ? _k : (_m = (_l = document.config) === null || _l === void 0 ? void 0 : _l.compilerOptions) === null || _m === void 0 ? void 0 : _m.customElement
        });
        text = tsx.code;
        tsxMap = tsx.map;
        exportedNames = tsx.exportedNames;
        if (tsxMap) {
            tsxMap.sources = [document.uri];
            const scriptInfo = document.scriptInfo || document.moduleScriptInfo;
            const tsCheck = utils_2.getTsCheckComment(scriptInfo === null || scriptInfo === void 0 ? void 0 : scriptInfo.content);
            if (tsCheck) {
                text = tsCheck + text;
                nrPrependedLines = 1;
            }
        }
    }
    catch (e) {
        // Error start/end logic is different and has different offsets for line, so we need to convert that
        const start = {
            line: ((_p = (_o = e.start) === null || _o === void 0 ? void 0 : _o.line) !== null && _p !== void 0 ? _p : 1) - 1,
            character: (_r = (_q = e.start) === null || _q === void 0 ? void 0 : _q.column) !== null && _r !== void 0 ? _r : 0
        };
        const end = e.end ? { line: e.end.line - 1, character: e.end.column } : start;
        parserError = {
            range: { start, end },
            message: e.message,
            code: -1
        };
        // fall back to extracted script, if any
        const scriptInfo = document.scriptInfo || document.moduleScriptInfo;
        text = scriptInfo ? scriptInfo.content : '';
    }
    return {
        tsxMap,
        text,
        exportedNames,
        parserError,
        nrPrependedLines,
        scriptKind
    };
}
/**
 * A svelte document snapshot suitable for the ts language service and the plugin.
 */
class SvelteDocumentSnapshot {
    constructor(parent, parserError, scriptKind, text, nrPrependedLines, exportedNames, tsxMap) {
        this.parent = parent;
        this.parserError = parserError;
        this.scriptKind = scriptKind;
        this.text = text;
        this.nrPrependedLines = nrPrependedLines;
        this.exportedNames = exportedNames;
        this.tsxMap = tsxMap;
        this.version = this.parent.version;
    }
    get filePath() {
        return this.parent.getFilePath() || '';
    }
    getText(start, end) {
        return this.text.substring(start, end);
    }
    getLength() {
        return this.text.length;
    }
    getFullText() {
        return this.text;
    }
    getChangeRange() {
        return undefined;
    }
    positionAt(offset) {
        return documents_1.positionAt(offset, this.text);
    }
    getLineContainingOffset(offset) {
        const chunks = this.getText(0, offset).split('\n');
        return chunks[chunks.length - 1];
    }
    hasProp(name) {
        return this.exportedNames.has(name);
    }
    getFragment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fragment) {
                const uri = utils_1.pathToUrl(this.filePath);
                this.fragment = new SvelteSnapshotFragment(yield this.getMapper(uri), this.text, this.parent, uri);
            }
            return this.fragment;
        });
    }
    destroyFragment() {
        if (this.fragment) {
            this.fragment.destroy();
            this.fragment = undefined;
        }
    }
    getMapper(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const scriptInfo = this.parent.scriptInfo || this.parent.moduleScriptInfo;
            if (!this.tsxMap) {
                if (!scriptInfo) {
                    return new documents_1.IdentityMapper(uri);
                }
                return new documents_1.FragmentMapper(this.parent.getText(), scriptInfo, uri);
            }
            return new DocumentMapper_1.ConsumerDocumentMapper(yield new source_map_1.SourceMapConsumer(this.tsxMap), uri, this.nrPrependedLines);
        });
    }
}
exports.SvelteDocumentSnapshot = SvelteDocumentSnapshot;
/**
 * A js/ts document snapshot suitable for the ts language service and the plugin.
 * Since no mapping has to be done here, it also implements the mapper interface.
 */
class JSOrTSDocumentSnapshot extends documents_1.IdentityMapper {
    constructor(version, filePath, text) {
        super(utils_1.pathToUrl(filePath));
        this.version = version;
        this.filePath = filePath;
        this.text = text;
        this.scriptKind = utils_2.getScriptKindFromFileName(this.filePath);
        this.scriptInfo = null;
    }
    getText(start, end) {
        return this.text.substring(start, end);
    }
    getLength() {
        return this.text.length;
    }
    getFullText() {
        return this.text;
    }
    getChangeRange() {
        return undefined;
    }
    positionAt(offset) {
        return documents_1.positionAt(offset, this.text);
    }
    offsetAt(position) {
        return documents_1.offsetAt(position, this.text);
    }
    getFragment() {
        return __awaiter(this, void 0, void 0, function* () {
            return this;
        });
    }
    destroyFragment() {
        // nothing to clean up
    }
    update(changes) {
        for (const change of changes) {
            let start = 0;
            let end = 0;
            if ('range' in change) {
                start = this.offsetAt(change.range.start);
                end = this.offsetAt(change.range.end);
            }
            else {
                end = this.getLength();
            }
            this.text = this.text.slice(0, start) + change.text + this.text.slice(end);
        }
        this.version++;
    }
}
exports.JSOrTSDocumentSnapshot = JSOrTSDocumentSnapshot;
/**
 * The mapper to get from original svelte document positions
 * to generated snapshot positions and vice versa.
 */
class SvelteSnapshotFragment {
    constructor(mapper, text, parent, url) {
        this.mapper = mapper;
        this.text = text;
        this.parent = parent;
        this.url = url;
    }
    get scriptInfo() {
        return this.parent.scriptInfo;
    }
    get moduleScriptInfo() {
        return this.parent.moduleScriptInfo;
    }
    get originalText() {
        return this.parent.getText();
    }
    getOriginalPosition(pos) {
        return this.mapper.getOriginalPosition(pos);
    }
    getGeneratedPosition(pos) {
        return this.mapper.getGeneratedPosition(pos);
    }
    isInGenerated(pos) {
        return !documents_1.isInTag(pos, this.parent.styleInfo);
    }
    getURL() {
        return this.url;
    }
    positionAt(offset) {
        return documents_1.positionAt(offset, this.text);
    }
    offsetAt(position) {
        return documents_1.offsetAt(position, this.text);
    }
    /**
     * Needs to be called when source mapper is no longer needed in order to prevent memory leaks.
     */
    destroy() {
        if (this.mapper.destroy) {
            this.mapper.destroy();
        }
    }
}
exports.SvelteSnapshotFragment = SvelteSnapshotFragment;
//# sourceMappingURL=DocumentSnapshot.js.map