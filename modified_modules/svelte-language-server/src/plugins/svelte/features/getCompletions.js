"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletions = void 0;
const os_1 = require("os");
const vscode_languageserver_1 = require("vscode-languageserver");
const SvelteTags_1 = require("./SvelteTags");
const documents_1 = require("../../../lib/documents");
const parseHtml_1 = require("../../../lib/documents/parseHtml");
const getModifierData_1 = require("./getModifierData");
const utils_1 = require("./utils");
const HTML_COMMENT_START = '<!--';
const componentDocumentationCompletion = {
    label: '@component',
    insertText: `component${os_1.EOL}$1${os_1.EOL}`,
    documentation: 'Documentation for this component. ' +
        'It will show up on hover. You can use markdown and code blocks here',
    insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
    kind: vscode_languageserver_1.CompletionItemKind.Snippet,
    sortText: '-1',
    filterText: 'component',
    preselect: true
};
function getCompletions(document, svelteDoc, position) {
    const offset = svelteDoc.offsetAt(position);
    const isInStyleOrScript = documents_1.isInTag(position, svelteDoc.style) ||
        documents_1.isInTag(position, svelteDoc.script) ||
        documents_1.isInTag(position, svelteDoc.moduleScript);
    const lastCharactersBeforePosition = svelteDoc
        .getText()
        // use last 10 characters, should cover 99% of all cases
        .substr(Math.max(offset - 10, 0), Math.min(offset, 10));
    const precededByOpeningBracket = /[\s\S]*{\s*[#:/@]\w*$/.test(lastCharactersBeforePosition);
    if (isInStyleOrScript) {
        return null;
    }
    if (precededByOpeningBracket) {
        return getTagCompletionsWithinMoustache();
    }
    const attributeContext = parseHtml_1.getAttributeContextAtPosition(document, position);
    if (attributeContext) {
        return getEventModifierCompletion(attributeContext);
    }
    return getComponentDocumentationCompletions();
    /**
     * Get completions for special svelte tags within moustache tags.
     */
    function getTagCompletionsWithinMoustache() {
        const triggerCharacter = getTriggerCharacter(lastCharactersBeforePosition);
        // return all, filtering with regards to user input will be done client side
        return getCompletionsWithRegardToTriggerCharacter(triggerCharacter, svelteDoc, offset);
    }
    function getComponentDocumentationCompletions() {
        if (!lastCharactersBeforePosition.includes(HTML_COMMENT_START)) {
            return null;
        }
        const commentStartIndex = lastCharactersBeforePosition.lastIndexOf(HTML_COMMENT_START);
        const text = lastCharactersBeforePosition
            .substring(commentStartIndex + HTML_COMMENT_START.length)
            .trimLeft();
        if (componentDocumentationCompletion.label.includes(text)) {
            return vscode_languageserver_1.CompletionList.create([componentDocumentationCompletion], false);
        }
        return null;
    }
}
exports.getCompletions = getCompletions;
function getEventModifierCompletion(attributeContext) {
    const modifiers = getModifierData_1.getModifierData();
    if (!attributeContext || !utils_1.attributeCanHaveEventModifier(attributeContext)) {
        return null;
    }
    const items = modifiers
        .filter((modifier) => {
        var _a;
        return !attributeContext.name.includes('|' + modifier.modifier) &&
            !((_a = modifier.modifiersInvalidWith) === null || _a === void 0 ? void 0 : _a.some((invalidWith) => attributeContext.name.includes(invalidWith)));
    })
        .map((m) => ({
        label: m.modifier,
        documentation: m.documentation,
        kind: vscode_languageserver_1.CompletionItemKind.Event
    }));
    return vscode_languageserver_1.CompletionList.create(items);
}
/**
 * Get completions with regard to trigger character.
 */
function getCompletionsWithRegardToTriggerCharacter(triggerCharacter, svelteDoc, offset) {
    if (triggerCharacter === '@') {
        return createCompletionItems([
            { tag: 'html', label: 'html' },
            { tag: 'debug', label: 'debug' }
        ]);
    }
    if (triggerCharacter === '#') {
        return createCompletionItems([
            { tag: 'if', label: 'if', insertText: 'if $1}\n\t$2\n{/if' },
            { tag: 'each', label: 'each', insertText: 'each $1 as $2}\n\t$3\n{/each' },
            {
                tag: 'await',
                label: 'await :then',
                insertText: 'await $1}\n\t$2\n{:then $3} \n\t$4\n{/await'
            },
            {
                tag: 'await',
                label: 'await then',
                insertText: 'await $1 then $2}\n\t$3\n{/await'
            },
            { tag: 'key', label: 'key', insertText: 'key $1}\n\t$2\n{/key' }
        ]);
    }
    if (triggerCharacter === ':') {
        return showCompletionWithRegardsToOpenedTags({
            awaitOpen: createCompletionItems([
                { tag: 'await', label: 'then' },
                { tag: 'await', label: 'catch' }
            ]),
            eachOpen: createCompletionItems([{ tag: 'each', label: 'else' }]),
            ifOpen: createCompletionItems([
                { tag: 'if', label: 'else' },
                { tag: 'if', label: 'else if' }
            ])
        }, svelteDoc, offset);
    }
    if (triggerCharacter === '/') {
        return showCompletionWithRegardsToOpenedTags({
            awaitOpen: createCompletionItems([{ tag: 'await', label: 'await' }]),
            eachOpen: createCompletionItems([{ tag: 'each', label: 'each' }]),
            ifOpen: createCompletionItems([{ tag: 'if', label: 'if' }]),
            keyOpen: createCompletionItems([{ tag: 'key', label: 'key' }])
        }, svelteDoc, offset);
    }
    return null;
}
/**
 * Get trigger character in front of current position.
 */
function getTriggerCharacter(content) {
    const chars = [
        getLastIndexOf('#'),
        getLastIndexOf('/'),
        getLastIndexOf(':'),
        getLastIndexOf('@')
    ];
    return chars.sort((c1, c2) => c2.idx - c1.idx)[0].char;
    function getLastIndexOf(char) {
        return { char, idx: content.lastIndexOf(char) };
    }
}
/**
 * Return completions with regards to last opened tag.
 */
function showCompletionWithRegardsToOpenedTags(on, svelteDoc, offset) {
    var _a;
    switch (SvelteTags_1.getLatestOpeningTag(svelteDoc, offset)) {
        case 'each':
            return on.eachOpen;
        case 'if':
            return on.ifOpen;
        case 'await':
            return on.awaitOpen;
        case 'key':
            return (_a = on === null || on === void 0 ? void 0 : on.keyOpen) !== null && _a !== void 0 ? _a : null;
        default:
            return null;
    }
}
/**
 * Create the completion items for given labels and tags.
 */
function createCompletionItems(items) {
    return vscode_languageserver_1.CompletionList.create(
    // add sortText/preselect so it is ranked higher than other completions and selected first
    items.map((item) => ({
        insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
        insertText: item.insertText,
        label: item.label,
        sortText: '-1',
        kind: vscode_languageserver_1.CompletionItemKind.Keyword,
        preselect: true,
        documentation: {
            kind: vscode_languageserver_1.MarkupKind.Markdown,
            value: SvelteTags_1.documentation[item.tag]
        }
    })));
}
//# sourceMappingURL=getCompletions.js.map