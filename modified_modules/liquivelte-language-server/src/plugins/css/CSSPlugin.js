"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSSPlugin = void 0;
const vscode_emmet_helper_1 = require("vscode-emmet-helper");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../lib/documents");
const CSSDocument_1 = require("./CSSDocument");
const service_1 = require("./service");
const global_vars_1 = require("./global-vars");
const getIdClassCompletion_1 = require("./features/getIdClassCompletion");
const parseHtml_1 = require("../../lib/documents/parseHtml");
const StyleAttributeDocument_1 = require("./StyleAttributeDocument");
class CSSPlugin {
    constructor(docManager, configManager) {
        this.cssDocuments = new WeakMap();
        this.triggerCharacters = ['.', ':', '-', '/'];
        this.globalVars = new global_vars_1.GlobalVars();
        this.configManager = configManager;
        this.updateConfigs();
        this.globalVars.watchFiles(this.configManager.get('css.globals'));
        this.configManager.onChange((config) => {
            this.globalVars.watchFiles(config.get('css.globals'));
            this.updateConfigs();
        });
        docManager.on('documentChange', (document) => this.cssDocuments.set(document, new CSSDocument_1.CSSDocument(document)));
        docManager.on('documentClose', (document) => this.cssDocuments.delete(document));
    }
    getSelectionRange(document, position) {
        if (!this.featureEnabled('selectionRange') || !documents_1.isInTag(position, document.styleInfo)) {
            return null;
        }
        const cssDocument = this.getCSSDoc(document);
        const [range] = service_1.getLanguageService(extractLanguage(cssDocument)).getSelectionRanges(cssDocument, [cssDocument.getGeneratedPosition(position)], cssDocument.stylesheet);
        if (!range) {
            return null;
        }
        return documents_1.mapSelectionRangeToParent(cssDocument, range);
    }
    getDiagnostics(document) {
        if (!this.featureEnabled('diagnostics')) {
            return [];
        }
        const cssDocument = this.getCSSDoc(document);
        const kind = extractLanguage(cssDocument);
        if (shouldExcludeValidation(kind)) {
            return [];
        }
        return service_1.getLanguageService(kind)
            .doValidation(cssDocument, cssDocument.stylesheet)
            .map((diagnostic) => (Object.assign(Object.assign({}, diagnostic), { source: service_1.getLanguage(kind) })))
            .map((diagnostic) => documents_1.mapObjWithRangeToOriginal(cssDocument, diagnostic));
    }
    doHover(document, position) {
        if (!this.featureEnabled('hover')) {
            return null;
        }
        const cssDocument = this.getCSSDoc(document);
        if (shouldExcludeHover(cssDocument)) {
            return null;
        }
        if (cssDocument.isInGenerated(position)) {
            return this.doHoverInternal(cssDocument, position);
        }
        const attributeContext = parseHtml_1.getAttributeContextAtPosition(document, position);
        if (attributeContext &&
            this.inStyleAttributeWithoutInterpolation(attributeContext, document.getText())) {
            const [start, end] = attributeContext.valueRange;
            return this.doHoverInternal(new StyleAttributeDocument_1.StyleAttributeDocument(document, start, end), position);
        }
        return null;
    }
    doHoverInternal(cssDocument, position) {
        const hoverInfo = service_1.getLanguageService(extractLanguage(cssDocument)).doHover(cssDocument, cssDocument.getGeneratedPosition(position), cssDocument.stylesheet);
        return hoverInfo ? documents_1.mapHoverToParent(cssDocument, hoverInfo) : hoverInfo;
    }
    getCompletions(document, position, completionContext) {
        const triggerCharacter = completionContext === null || completionContext === void 0 ? void 0 : completionContext.triggerCharacter;
        const triggerKind = completionContext === null || completionContext === void 0 ? void 0 : completionContext.triggerKind;
        const isCustomTriggerCharacter = triggerKind === vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter;
        if (isCustomTriggerCharacter &&
            triggerCharacter &&
            !this.triggerCharacters.includes(triggerCharacter)) {
            return null;
        }
        if (!this.featureEnabled('completions')) {
            return null;
        }
        const cssDocument = this.getCSSDoc(document);
        if (cssDocument.isInGenerated(position)) {
            return this.getCompletionsInternal(document, position, cssDocument);
        }
        const attributeContext = parseHtml_1.getAttributeContextAtPosition(document, position);
        if (!attributeContext) {
            return null;
        }
        if (this.inStyleAttributeWithoutInterpolation(attributeContext, document.getText())) {
            const [start, end] = attributeContext.valueRange;
            return this.getCompletionsInternal(document, position, new StyleAttributeDocument_1.StyleAttributeDocument(document, start, end));
        }
        else {
            return getIdClassCompletion_1.getIdClassCompletion(cssDocument, attributeContext);
        }
    }
    inStyleAttributeWithoutInterpolation(attrContext, text) {
        return (attrContext.name === 'style' &&
            !!attrContext.valueRange &&
            !text.substring(attrContext.valueRange[0], attrContext.valueRange[1]).includes('{'));
    }
    getCompletionsInternal(document, position, cssDocument) {
        if (isSASS(cssDocument)) {
            // the css language service does not support sass, still we can use
            // the emmet helper directly to at least get emmet completions
            return (vscode_emmet_helper_1.doComplete(document, position, 'sass', this.configManager.getEmmetConfig()) ||
                null);
        }
        const type = extractLanguage(cssDocument);
        if (shouldExcludeCompletion(type)) {
            return null;
        }
        const lang = service_1.getLanguageService(type);
        let emmetResults = {
            isIncomplete: false,
            items: []
        };
        if (this.configManager.getConfig().css.completions.emmet &&
            this.configManager.getEmmetConfig().showExpandedAbbreviation !== 'never') {
            lang.setCompletionParticipants([
                {
                    onCssProperty: (context) => {
                        if (context === null || context === void 0 ? void 0 : context.propertyName) {
                            emmetResults =
                                vscode_emmet_helper_1.doComplete(cssDocument, cssDocument.getGeneratedPosition(position), service_1.getLanguage(type), this.configManager.getEmmetConfig()) || emmetResults;
                        }
                    },
                    onCssPropertyValue: (context) => {
                        if (context === null || context === void 0 ? void 0 : context.propertyValue) {
                            emmetResults =
                                vscode_emmet_helper_1.doComplete(cssDocument, cssDocument.getGeneratedPosition(position), service_1.getLanguage(type), this.configManager.getEmmetConfig()) || emmetResults;
                        }
                    }
                }
            ]);
        }
        const results = lang.doComplete(cssDocument, cssDocument.getGeneratedPosition(position), cssDocument.stylesheet);
        return vscode_languageserver_1.CompletionList.create(this.appendGlobalVars([...(results ? results.items : []), ...emmetResults.items].map((completionItem) => documents_1.mapCompletionItemToOriginal(cssDocument, completionItem))), 
        // Emmet completions change on every keystroke, so they are never complete
        emmetResults.items.length > 0);
    }
    appendGlobalVars(items) {
        // Finding one value with that item kind means we are in a value completion scenario
        const value = items.find((item) => item.kind === vscode_languageserver_1.CompletionItemKind.Value);
        if (!value) {
            return items;
        }
        const additionalItems = this.globalVars
            .getGlobalVars()
            .map((globalVar) => ({
            label: `var(${globalVar.name})`,
            sortText: '-',
            detail: `${globalVar.filename}\n\n${globalVar.name}: ${globalVar.value}`,
            kind: vscode_languageserver_1.CompletionItemKind.Value
        }));
        return [...items, ...additionalItems];
    }
    getDocumentColors(document) {
        if (!this.featureEnabled('documentColors')) {
            return [];
        }
        const cssDocument = this.getCSSDoc(document);
        if (shouldExcludeColor(cssDocument)) {
            return [];
        }
        return service_1.getLanguageService(extractLanguage(cssDocument))
            .findDocumentColors(cssDocument, cssDocument.stylesheet)
            .map((colorInfo) => documents_1.mapObjWithRangeToOriginal(cssDocument, colorInfo));
    }
    getColorPresentations(document, range, color) {
        if (!this.featureEnabled('colorPresentations')) {
            return [];
        }
        const cssDocument = this.getCSSDoc(document);
        if ((!cssDocument.isInGenerated(range.start) && !cssDocument.isInGenerated(range.end)) ||
            shouldExcludeColor(cssDocument)) {
            return [];
        }
        return service_1.getLanguageService(extractLanguage(cssDocument))
            .getColorPresentations(cssDocument, cssDocument.stylesheet, color, documents_1.mapRangeToGenerated(cssDocument, range))
            .map((colorPres) => documents_1.mapColorPresentationToOriginal(cssDocument, colorPres));
    }
    getDocumentSymbols(document) {
        if (!this.featureEnabled('documentColors')) {
            return [];
        }
        const cssDocument = this.getCSSDoc(document);
        if (shouldExcludeDocumentSymbols(cssDocument)) {
            return [];
        }
        return service_1.getLanguageService(extractLanguage(cssDocument))
            .findDocumentSymbols(cssDocument, cssDocument.stylesheet)
            .map((symbol) => {
            if (!symbol.containerName) {
                return Object.assign(Object.assign({}, symbol), { 
                    // TODO: this could contain other things, e.g. style.myclass
                    containerName: 'style' });
            }
            return symbol;
        })
            .map((symbol) => documents_1.mapSymbolInformationToOriginal(cssDocument, symbol));
    }
    getCSSDoc(document) {
        let cssDoc = this.cssDocuments.get(document);
        if (!cssDoc || cssDoc.version < document.version) {
            cssDoc = new CSSDocument_1.CSSDocument(document);
            this.cssDocuments.set(document, cssDoc);
        }
        return cssDoc;
    }
    updateConfigs() {
        var _a, _b, _c;
        (_a = service_1.getLanguageService('css')) === null || _a === void 0 ? void 0 : _a.configure(this.configManager.getCssConfig());
        (_b = service_1.getLanguageService('scss')) === null || _b === void 0 ? void 0 : _b.configure(this.configManager.getScssConfig());
        (_c = service_1.getLanguageService('less')) === null || _c === void 0 ? void 0 : _c.configure(this.configManager.getLessConfig());
    }
    featureEnabled(feature) {
        return (this.configManager.enabled('css.enable') &&
            this.configManager.enabled(`css.${feature}.enable`));
    }
}
exports.CSSPlugin = CSSPlugin;
function shouldExcludeValidation(kind) {
    switch (kind) {
        case 'postcss':
        case 'sass':
        case 'stylus':
        case 'styl':
            return true;
        default:
            return false;
    }
}
function shouldExcludeCompletion(kind) {
    switch (kind) {
        case 'stylus':
        case 'styl':
            return true;
        default:
            return false;
    }
}
function shouldExcludeDocumentSymbols(document) {
    switch (extractLanguage(document)) {
        case 'sass':
        case 'stylus':
        case 'styl':
            return true;
        default:
            return false;
    }
}
function shouldExcludeHover(document) {
    switch (extractLanguage(document)) {
        case 'sass':
        case 'stylus':
        case 'styl':
            return true;
        default:
            return false;
    }
}
function shouldExcludeColor(document) {
    switch (extractLanguage(document)) {
        case 'sass':
        case 'stylus':
        case 'styl':
            return true;
        default:
            return false;
    }
}
function isSASS(document) {
    switch (extractLanguage(document)) {
        case 'sass':
            return true;
        default:
            return false;
    }
}
function extractLanguage(document) {
    const lang = document.languageId;
    return lang.replace(/^text\//, '');
}
//# sourceMappingURL=CSSPlugin.js.map