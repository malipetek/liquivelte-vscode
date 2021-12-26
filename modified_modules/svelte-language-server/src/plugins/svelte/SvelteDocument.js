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
exports.SvelteFragmentMapper = exports.FallbackTranspiledSvelteDocument = exports.TranspiledSvelteDocument = exports.SvelteDocument = exports.TranspileErrorSource = void 0;
const source_map_1 = require("source-map");
const importPackage_1 = require("../../importPackage");
const documents_1 = require("../../lib/documents");
const utils_1 = require("../../utils");
var TranspileErrorSource;
(function (TranspileErrorSource) {
    TranspileErrorSource["Script"] = "Script";
    TranspileErrorSource["Style"] = "Style";
})(TranspileErrorSource = exports.TranspileErrorSource || (exports.TranspileErrorSource = {}));
/**
 * Represents a text document that contains a svelte component.
 */
class SvelteDocument {
    constructor(parent) {
        this.parent = parent;
        this.languageId = 'svelte';
        this.version = 0;
        this.uri = this.parent.uri;
        this.script = this.parent.scriptInfo;
        this.moduleScript = this.parent.moduleScriptInfo;
        this.style = this.parent.styleInfo;
        this.version = this.parent.version;
    }
    get config() {
        return this.parent.configPromise;
    }
    getText() {
        return this.parent.getText();
    }
    getFilePath() {
        return this.parent.getFilePath() || '';
    }
    offsetAt(position) {
        return this.parent.offsetAt(position);
    }
    getTranspiled() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.transpiledDoc) {
                const { version: { major, minor } } = importPackage_1.getPackageInfo('svelte', this.getFilePath());
                if (major > 3 || (major === 3 && minor >= 32)) {
                    this.transpiledDoc = yield TranspiledSvelteDocument.create(this.parent, yield this.config);
                }
                else {
                    this.transpiledDoc = yield FallbackTranspiledSvelteDocument.create(this.parent, (_a = (yield this.config)) === null || _a === void 0 ? void 0 : _a.preprocess);
                }
            }
            return this.transpiledDoc;
        });
    }
    getCompiled() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.compileResult) {
                this.compileResult = yield this.getCompiledWith((_a = (yield this.config)) === null || _a === void 0 ? void 0 : _a.compilerOptions);
            }
            return this.compileResult;
        });
    }
    getCompiledWith(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const svelte = importPackage_1.importSvelte(this.getFilePath());
            return svelte.compile((yield this.getTranspiled()).getText(), options);
        });
    }
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroyTranspiled() {
        if (this.transpiledDoc) {
            this.transpiledDoc.destroy();
            this.transpiledDoc = undefined;
        }
    }
}
exports.SvelteDocument = SvelteDocument;
class TranspiledSvelteDocument {
    constructor(code, mapper) {
        this.code = code;
        this.mapper = mapper;
    }
    static create(document, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(config === null || config === void 0 ? void 0 : config.preprocess)) {
                return new TranspiledSvelteDocument(document.getText());
            }
            const filename = document.getFilePath() || '';
            const svelte = importPackage_1.importSvelte(filename);
            const preprocessed = yield svelte.preprocess(document.getText(), wrapPreprocessors(config === null || config === void 0 ? void 0 : config.preprocess), {
                filename
            });
            if (preprocessed.code === document.getText()) {
                return new TranspiledSvelteDocument(document.getText());
            }
            return new TranspiledSvelteDocument(preprocessed.code, preprocessed.map
                ? new documents_1.SourceMapDocumentMapper(yield createSourceMapConsumer(preprocessed.map), 
                // The "sources" array only contains the Svelte filename, not its path.
                // For getting generated positions, the sourcemap consumer wants an exact match
                // of the source filepath. Therefore only pass in the filename here.
                utils_1.getLastPartOfPath(filename))
                : undefined);
        });
    }
    getOriginalPosition(generatedPosition) {
        var _a;
        return ((_a = this.mapper) === null || _a === void 0 ? void 0 : _a.getOriginalPosition(generatedPosition)) || generatedPosition;
    }
    getText() {
        return this.code;
    }
    getGeneratedPosition(originalPosition) {
        var _a;
        return ((_a = this.mapper) === null || _a === void 0 ? void 0 : _a.getGeneratedPosition(originalPosition)) || originalPosition;
    }
    destroy() {
        var _a;
        (_a = this.mapper) === null || _a === void 0 ? void 0 : _a.destroy();
    }
}
exports.TranspiledSvelteDocument = TranspiledSvelteDocument;
/**
 * Only used when the user has an old Svelte version installed where source map support
 * for preprocessors is not built in yet.
 * This fallback version does not map correctly when there's both a module and instance script.
 * It isn't worth fixing these cases though now that Svelte ships a preprocessor with source maps.
 */
class FallbackTranspiledSvelteDocument {
    constructor(parent, transpiled, scriptMapper, styleMapper) {
        var _a, _b;
        this.parent = parent;
        this.transpiled = transpiled;
        this.scriptMapper = scriptMapper;
        this.styleMapper = styleMapper;
        this.fragmentInfos = [(_a = this.scriptMapper) === null || _a === void 0 ? void 0 : _a.fragmentInfo, (_b = this.styleMapper) === null || _b === void 0 ? void 0 : _b.fragmentInfo]
            .filter(utils_1.isNotNullOrUndefined)
            .sort((i1, i2) => i1.end - i2.end);
    }
    static create(document, preprocessors = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const { transpiled, processedScripts, processedStyles } = yield transpile(document, preprocessors);
            const scriptMapper = yield SvelteFragmentMapper.createScript(document, transpiled, processedScripts);
            const styleMapper = yield SvelteFragmentMapper.createStyle(document, transpiled, processedStyles);
            return new FallbackTranspiledSvelteDocument(document, transpiled, scriptMapper, styleMapper);
        });
    }
    getOriginalPosition(generatedPosition) {
        var _a, _b;
        if ((_a = this.scriptMapper) === null || _a === void 0 ? void 0 : _a.isInTranspiledFragment(generatedPosition)) {
            return this.scriptMapper.getOriginalPosition(generatedPosition);
        }
        if ((_b = this.styleMapper) === null || _b === void 0 ? void 0 : _b.isInTranspiledFragment(generatedPosition)) {
            return this.styleMapper.getOriginalPosition(generatedPosition);
        }
        // Position is not in fragments, but we still need to account for
        // the length differences of the fragments before the position.
        let offset = documents_1.offsetAt(generatedPosition, this.transpiled);
        for (const fragmentInfo of this.fragmentInfos) {
            if (offset > fragmentInfo.end) {
                offset += fragmentInfo.diff;
            }
        }
        return this.parent.positionAt(offset);
    }
    getURL() {
        return this.parent.getURL();
    }
    getText() {
        return this.transpiled;
    }
    getGeneratedPosition(originalPosition) {
        const { styleInfo, scriptInfo } = this.parent;
        if (documents_1.isInTag(originalPosition, scriptInfo) && this.scriptMapper) {
            return this.scriptMapper.getGeneratedPosition(originalPosition);
        }
        if (documents_1.isInTag(originalPosition, styleInfo) && this.styleMapper) {
            return this.styleMapper.getGeneratedPosition(originalPosition);
        }
        // Add length difference of each fragment
        let offset = documents_1.offsetAt(originalPosition, this.parent.getText());
        for (const fragmentInfo of this.fragmentInfos) {
            if (offset > fragmentInfo.end) {
                offset -= fragmentInfo.diff;
            }
        }
        return documents_1.positionAt(offset, this.getText());
    }
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroy() {
        var _a, _b;
        (_a = this.scriptMapper) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.styleMapper) === null || _b === void 0 ? void 0 : _b.destroy();
    }
}
exports.FallbackTranspiledSvelteDocument = FallbackTranspiledSvelteDocument;
class SvelteFragmentMapper {
    constructor(
    /**
     * End offset + length difference to original
     */
    fragmentInfo, 
    /**
     * Maps between full original source and fragment within that original.
     */
    originalFragmentMapper, 
    /**
     * Maps between full transpiled source and fragment within that transpiled.
     */
    transpiledFragmentMapper, 
    /**
     * Maps between original and transpiled, within fragment.
     */
    sourceMapper) {
        this.fragmentInfo = fragmentInfo;
        this.originalFragmentMapper = originalFragmentMapper;
        this.transpiledFragmentMapper = transpiledFragmentMapper;
        this.sourceMapper = sourceMapper;
    }
    static createStyle(originalDoc, transpiled, processed) {
        return __awaiter(this, void 0, void 0, function* () {
            return SvelteFragmentMapper.create(originalDoc, transpiled, originalDoc.styleInfo, documents_1.extractStyleTag(transpiled), processed);
        });
    }
    static createScript(originalDoc, transpiled, processed) {
        return __awaiter(this, void 0, void 0, function* () {
            const scriptInfo = originalDoc.scriptInfo || originalDoc.moduleScriptInfo;
            const maybeScriptTag = documents_1.extractScriptTags(transpiled);
            const maybeScriptTagInfo = maybeScriptTag && (maybeScriptTag.script || maybeScriptTag.moduleScript);
            return SvelteFragmentMapper.create(originalDoc, transpiled, scriptInfo, maybeScriptTagInfo || null, processed);
        });
    }
    static create(originalDoc, transpiled, originalTagInfo, transpiledTagInfo, processed) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceMapper = processed.length > 0
                ? yield SvelteFragmentMapper.createSourceMapper(processed, originalDoc)
                : new documents_1.IdentityMapper(originalDoc.uri);
            if (originalTagInfo && transpiledTagInfo) {
                const sourceLength = originalTagInfo.container.end - originalTagInfo.container.start;
                const transpiledLength = transpiledTagInfo.container.end - transpiledTagInfo.container.start;
                const diff = sourceLength - transpiledLength;
                return new SvelteFragmentMapper({ end: transpiledTagInfo.container.end, diff }, new documents_1.FragmentMapper(originalDoc.getText(), originalTagInfo, originalDoc.uri), new documents_1.FragmentMapper(transpiled, transpiledTagInfo, originalDoc.uri), sourceMapper);
            }
            return null;
        });
    }
    static createSourceMapper(processed, originalDoc) {
        return __awaiter(this, void 0, void 0, function* () {
            return processed.reduce((parent, processedSingle) => __awaiter(this, void 0, void 0, function* () {
                return (processedSingle === null || processedSingle === void 0 ? void 0 : processedSingle.map)
                    ? new documents_1.SourceMapDocumentMapper(yield createSourceMapConsumer(processedSingle.map), originalDoc.uri, yield parent)
                    : new documents_1.IdentityMapper(originalDoc.uri, yield parent);
            }), Promise.resolve(undefined));
        });
    }
    isInTranspiledFragment(generatedPosition) {
        return this.transpiledFragmentMapper.isInGenerated(generatedPosition);
    }
    getOriginalPosition(generatedPosition) {
        // Map the position to be relative to the transpiled fragment
        const positionInTranspiledFragment = this.transpiledFragmentMapper.getGeneratedPosition(generatedPosition);
        // Map the position, using the sourcemap, to the original position in the source fragment
        const positionInOriginalFragment = this.sourceMapper.getOriginalPosition(positionInTranspiledFragment);
        // Map the position to be in the original fragment's parent
        return this.originalFragmentMapper.getOriginalPosition(positionInOriginalFragment);
    }
    /**
     * Reversing `getOriginalPosition`
     */
    getGeneratedPosition(originalPosition) {
        const positionInOriginalFragment = this.originalFragmentMapper.getGeneratedPosition(originalPosition);
        const positionInTranspiledFragment = this.sourceMapper.getGeneratedPosition(positionInOriginalFragment);
        return this.transpiledFragmentMapper.getOriginalPosition(positionInTranspiledFragment);
    }
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroy() {
        if (this.sourceMapper.destroy) {
            this.sourceMapper.destroy();
        }
    }
}
exports.SvelteFragmentMapper = SvelteFragmentMapper;
/**
 * Wrap preprocessors and rethrow on errors with more info on where the error came from.
 */
function wrapPreprocessors(preprocessors = []) {
    preprocessors = Array.isArray(preprocessors) ? preprocessors : [preprocessors];
    return preprocessors.map((preprocessor) => {
        const wrappedPreprocessor = { markup: preprocessor.markup };
        if (preprocessor.script) {
            wrappedPreprocessor.script = (args) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield preprocessor.script(args);
                }
                catch (e) {
                    e.__source = TranspileErrorSource.Script;
                    throw e;
                }
            });
        }
        if (preprocessor.style) {
            wrappedPreprocessor.style = (args) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield preprocessor.style(args);
                }
                catch (e) {
                    e.__source = TranspileErrorSource.Style;
                    throw e;
                }
            });
        }
        return wrappedPreprocessor;
    });
}
function transpile(document, preprocessors = []) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        preprocessors = Array.isArray(preprocessors) ? preprocessors : [preprocessors];
        const processedScripts = [];
        const processedStyles = [];
        const wrappedPreprocessors = preprocessors.map((preprocessor) => {
            const wrappedPreprocessor = { markup: preprocessor.markup };
            if (preprocessor.script) {
                wrappedPreprocessor.script = (args) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const res = yield preprocessor.script(args);
                        if (res && res.map) {
                            processedScripts.push(res);
                        }
                        return res;
                    }
                    catch (e) {
                        e.__source = TranspileErrorSource.Script;
                        throw e;
                    }
                });
            }
            if (preprocessor.style) {
                wrappedPreprocessor.style = (args) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const res = yield preprocessor.style(args);
                        if (res && res.map) {
                            processedStyles.push(res);
                        }
                        return res;
                    }
                    catch (e) {
                        e.__source = TranspileErrorSource.Style;
                        throw e;
                    }
                });
            }
            return wrappedPreprocessor;
        });
        const svelte = importPackage_1.importSvelte(document.getFilePath() || '');
        const result = yield svelte.preprocess(document.getText(), wrappedPreprocessors, {
            filename: document.getFilePath() || ''
        });
        const transpiled = result.code || ((_a = result.toString) === null || _a === void 0 ? void 0 : _a.call(result)) || '';
        return { transpiled, processedScripts, processedStyles };
    });
}
function createSourceMapConsumer(map) {
    return __awaiter(this, void 0, void 0, function* () {
        return new source_map_1.SourceMapConsumer(normalizeMap(map));
        function normalizeMap(map) {
            // We don't know what we get, could be a stringified sourcemap,
            // or a class which has the required properties on it, or a class
            // which we need to call toString() on to get the correct format.
            if (typeof map === 'string' || map.version) {
                return map;
            }
            return map.toString();
        }
    });
}
//# sourceMappingURL=SvelteDocument.js.map