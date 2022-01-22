"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const utils_1 = require("../../utils");
const DocumentBase_1 = require("./DocumentBase");
const utils_2 = require("./utils");
const parseHtml_1 = require("./parseHtml");
const configLoader_1 = require("./configLoader");
/**
 * Represents a text document contains a svelte component.
 */
class Document extends DocumentBase_1.WritableDocument {
    constructor(url, content) {
        super();
        this.url = url;
        this.content = content;
        this.languageId = 'liquivelte';
        this.scriptInfo = null;
        this.moduleScriptInfo = null;
        this.styleInfo = null;
        this.templateInfo = null;
        this.configPromise = configLoader_1.configLoader.awaitConfig(this.getFilePath() || '');
        this.updateDocInfo();
    }
    updateDocInfo() {
        this.html = parseHtml_1.parseHtml(this.content);
        const update = (config) => {
            const scriptTags = utils_2.extractScriptTags(this.content, this.html);
            this.config = config;
            this.scriptInfo = this.addDefaultLanguage(config, (scriptTags === null || scriptTags === void 0 ? void 0 : scriptTags.script) || null, 'script');
            this.moduleScriptInfo = this.addDefaultLanguage(config, (scriptTags === null || scriptTags === void 0 ? void 0 : scriptTags.moduleScript) || null, 'script');
            this.styleInfo = this.addDefaultLanguage(config, utils_2.extractStyleTag(this.content, this.html), 'style');
            this.templateInfo = this.addDefaultLanguage(config, utils_2.extractTemplateTag(this.content, this.html), 'markup');
        };
        const config = configLoader_1.configLoader.getConfig(this.getFilePath() || '');
        if (config && !config.loadConfigError) {
            update(config);
        }
        else {
            update(undefined);
            this.configPromise.then((c) => update(c));
        }
    }
    /**
     * Get text content
     */
    getText() {
        return this.content;
    }
    /**
     * Set text content and increase the document version
     */
    setText(text) {
        this.content = text;
        this.version++;
        this.updateDocInfo();
    }
    /**
     * Returns the file path if the url scheme is file
     */
    getFilePath() {
        return utils_1.urlToPath(this.url);
    }
    /**
     * Get URL file path.
     */
    getURL() {
        return this.url;
    }
    /**
     * Returns the language associated to script, style or template.
     * Returns an empty string if there's nothing set.
     */
    getLanguageAttribute(tag) {
        var _a, _b, _c, _d;
        const attrs = (tag === 'style'
            ? (_a = this.styleInfo) === null || _a === void 0 ? void 0 : _a.attributes
            : tag === 'script'
                ? ((_b = this.scriptInfo) === null || _b === void 0 ? void 0 : _b.attributes) || ((_c = this.moduleScriptInfo) === null || _c === void 0 ? void 0 : _c.attributes)
                : (_d = this.templateInfo) === null || _d === void 0 ? void 0 : _d.attributes) || {};
        const lang = attrs.lang || attrs.type || '';
        return lang.replace(/^text\//, '');
    }
    addDefaultLanguage(config, tagInfo, tag) {
        var _a, _b, _c, _d;
        if (!tagInfo || !config) {
            return tagInfo;
        }
        const defaultLang = Array.isArray(config.preprocess)
            ? (_b = (_a = config.preprocess.find((group) => { var _a; return (_a = group.defaultLanguages) === null || _a === void 0 ? void 0 : _a[tag]; })) === null || _a === void 0 ? void 0 : _a.defaultLanguages) === null || _b === void 0 ? void 0 : _b[tag]
            : (_d = (_c = config.preprocess) === null || _c === void 0 ? void 0 : _c.defaultLanguages) === null || _d === void 0 ? void 0 : _d[tag];
        if (!tagInfo.attributes.lang && !tagInfo.attributes.type && defaultLang) {
            tagInfo.attributes.lang = defaultLang;
        }
        return tagInfo;
    }
}
exports.Document = Document;
//# sourceMappingURL=Document.js.map