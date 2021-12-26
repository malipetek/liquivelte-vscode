"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLPlugin = void 0;
const vscode_emmet_helper_1 = require("vscode-emmet-helper");
const vscode_html_languageservice_1 = require("vscode-html-languageservice");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../lib/documents");
const dataProvider_1 = require("./dataProvider");
const utils_1 = require("../../lib/documents/utils");
const utils_2 = require("../../utils");
class HTMLPlugin {
    constructor(docManager, configManager) {
        this.lang = vscode_html_languageservice_1.getLanguageService({
            customDataProviders: [dataProvider_1.svelteHtmlDataProvider],
            useDefaultDataProvider: false
        });
        this.documents = new WeakMap();
        this.styleScriptTemplate = new Set(['template', 'style', 'script']);
        this.configManager = configManager;
        docManager.on('documentChange', (document) => {
            this.documents.set(document, document.html);
        });
    }
    doHover(document, position) {
        if (!this.featureEnabled('hover')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        const node = html.findNodeAt(document.offsetAt(position));
        if (!node || utils_2.possiblyComponent(node)) {
            return null;
        }
        return this.lang.doHover(document, position, html);
    }
    getCompletions(document, position) {
        if (!this.featureEnabled('completions')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        if (this.isInsideMoustacheTag(html, document, position) ||
            documents_1.isInTag(position, document.scriptInfo) ||
            documents_1.isInTag(position, document.moduleScriptInfo)) {
            return null;
        }
        let emmetResults = {
            isIncomplete: false,
            items: []
        };
        if (this.configManager.getConfig().html.completions.emmet &&
            this.configManager.getEmmetConfig().showExpandedAbbreviation !== 'never') {
            this.lang.setCompletionParticipants([
                {
                    onHtmlContent: () => (emmetResults =
                        vscode_emmet_helper_1.doComplete(document, position, 'html', this.configManager.getEmmetConfig()) || emmetResults)
                }
            ]);
        }
        const results = this.isInComponentTag(html, document, position)
            ? // Only allow emmet inside component element tags.
                // Other attributes/events would be false positives.
                vscode_languageserver_1.CompletionList.create([])
            : this.lang.doComplete(document, position, html);
        const items = this.toCompletionItems(results.items);
        items.forEach((item) => {
            if (item.label.startsWith('on:') && item.textEdit) {
                item.textEdit = Object.assign(Object.assign({}, item.textEdit), { newText: item.textEdit.newText.replace('="$1"', '$2="$1"') });
            }
        });
        return vscode_languageserver_1.CompletionList.create([
            ...this.toCompletionItems(items),
            ...this.getLangCompletions(items),
            ...emmetResults.items
        ], 
        // Emmet completions change on every keystroke, so they are never complete
        emmetResults.items.length > 0);
    }
    /**
     * The HTML language service uses newer types which clash
     * without the stable ones. Transform to the stable types.
     */
    toCompletionItems(items) {
        return items.map((item) => {
            if (!item.textEdit || vscode_languageserver_1.TextEdit.is(item.textEdit)) {
                return item;
            }
            return Object.assign(Object.assign({}, item), { textEdit: vscode_languageserver_1.TextEdit.replace(item.textEdit.replace, item.textEdit.newText) });
        });
    }
    isInComponentTag(html, document, position) {
        return !!documents_1.getNodeIfIsInComponentStartTag(html, document.offsetAt(position));
    }
    getLangCompletions(completions) {
        const styleScriptTemplateCompletions = completions.filter((completion) => completion.kind === vscode_languageserver_1.CompletionItemKind.Property &&
            this.styleScriptTemplate.has(completion.label));
        const langCompletions = [];
        addLangCompletion('script', ['ts']);
        addLangCompletion('style', ['less', 'scss']);
        addLangCompletion('template', ['pug']);
        return langCompletions;
        function addLangCompletion(tag, languages) {
            const existingCompletion = styleScriptTemplateCompletions.find((completion) => completion.label === tag);
            if (!existingCompletion) {
                return;
            }
            languages.forEach((lang) => langCompletions.push(Object.assign(Object.assign({}, existingCompletion), { label: `${tag} (lang="${lang}")`, insertText: existingCompletion.insertText &&
                    `${existingCompletion.insertText} lang="${lang}"`, textEdit: existingCompletion.textEdit && vscode_languageserver_1.TextEdit.is(existingCompletion.textEdit)
                    ? {
                        range: existingCompletion.textEdit.range,
                        newText: `${existingCompletion.textEdit.newText} lang="${lang}"`
                    }
                    : undefined })));
        }
    }
    doTagComplete(document, position) {
        if (!this.featureEnabled('tagComplete')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        if (this.isInsideMoustacheTag(html, document, position)) {
            return null;
        }
        return this.lang.doTagComplete(document, position, html);
    }
    isInsideMoustacheTag(html, document, position) {
        const offset = document.offsetAt(position);
        const node = html.findNodeAt(offset);
        return utils_1.isInsideMoustacheTag(document.getText(), node.start, offset);
    }
    getDocumentSymbols(document) {
        if (!this.featureEnabled('documentSymbols')) {
            return [];
        }
        const html = this.documents.get(document);
        if (!html) {
            return [];
        }
        return this.lang.findDocumentSymbols(document, html);
    }
    rename(document, position, newName) {
        if (!this.featureEnabled('renameTags')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        const node = html.findNodeAt(document.offsetAt(position));
        if (!node || utils_2.possiblyComponent(node)) {
            return null;
        }
        return this.lang.doRename(document, position, newName, html);
    }
    prepareRename(document, position) {
        if (!this.featureEnabled('renameTags')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        const offset = document.offsetAt(position);
        const node = html.findNodeAt(offset);
        if (!node || utils_2.possiblyComponent(node) || !node.tag || !this.isRenameAtTag(node, offset)) {
            return null;
        }
        const tagNameStart = node.start + '<'.length;
        return utils_1.toRange(document.getText(), tagNameStart, tagNameStart + node.tag.length);
    }
    getLinkedEditingRanges(document, position) {
        if (!this.featureEnabled('linkedEditing')) {
            return null;
        }
        const html = this.documents.get(document);
        if (!html) {
            return null;
        }
        const ranges = this.lang.findLinkedEditingRanges(document, position, html);
        if (!ranges) {
            return null;
        }
        return { ranges };
    }
    /**
     * Returns true if rename happens at the tag name, not anywhere inbetween.
     */
    isRenameAtTag(node, offset) {
        if (!node.tag) {
            return false;
        }
        const startTagNameEnd = node.start + `<${node.tag}`.length;
        const isAtStartTag = offset > node.start && offset <= startTagNameEnd;
        const isAtEndTag = node.endTagStart !== undefined && offset >= node.endTagStart && offset < node.end;
        return isAtStartTag || isAtEndTag;
    }
    featureEnabled(feature) {
        return (this.configManager.enabled('html.enable') &&
            this.configManager.enabled(`html.${feature}.enable`));
    }
}
exports.HTMLPlugin = HTMLPlugin;
//# sourceMappingURL=HTMLPlugin.js.map