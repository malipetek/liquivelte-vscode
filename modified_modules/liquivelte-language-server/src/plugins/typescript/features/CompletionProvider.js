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
exports.CompletionsProviderImpl = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../../../utils");
const previewer_1 = require("../previewer");
const utils_2 = require("../utils");
const getJsDocTemplateCompletion_1 = require("./getJsDocTemplateCompletion");
const utils_3 = require("./utils");
class CompletionsProviderImpl {
    constructor(lsAndTsDocResolver, configManager) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
        this.configManager = configManager;
        /**
         * The language service throws an error if the character is not a valid trigger character.
         * Also, the completions are worse.
         * Therefore, only use the characters the typescript compiler treats as valid.
         */
        this.validTriggerCharacters = ['.', '"', "'", '`', '/', '@', '<', '#'];
    }
    isValidTriggerCharacter(character) {
        return this.validTriggerCharacters.includes(character);
    }
    getCompletions(document, position, completionContext, cancellationToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (documents_1.isInTag(position, document.styleInfo)) {
                return null;
            }
            const { lang, tsDoc, userPreferences } = yield this.lsAndTsDocResolver.getLSAndTSDoc(document);
            const filePath = tsDoc.filePath;
            if (!filePath) {
                return null;
            }
            const triggerCharacter = completionContext === null || completionContext === void 0 ? void 0 : completionContext.triggerCharacter;
            const triggerKind = completionContext === null || completionContext === void 0 ? void 0 : completionContext.triggerKind;
            const validTriggerCharacter = this.isValidTriggerCharacter(triggerCharacter)
                ? triggerCharacter
                : undefined;
            const isCustomTriggerCharacter = triggerKind === vscode_languageserver_1.CompletionTriggerKind.TriggerCharacter;
            const isJsDocTriggerCharacter = triggerCharacter === '*';
            const isEventOrSlotLetTriggerCharacter = triggerCharacter === ':';
            // ignore any custom trigger character specified in server capabilities
            //  and is not allow by ts
            if (isCustomTriggerCharacter &&
                !validTriggerCharacter &&
                !isJsDocTriggerCharacter &&
                !isEventOrSlotLetTriggerCharacter) {
                return null;
            }
            if (this.canReuseLastCompletion(this.lastCompletion, triggerKind, triggerCharacter, document, position)) {
                this.lastCompletion.position = position;
                return this.lastCompletion.completionList;
            }
            else {
                this.lastCompletion = undefined;
            }
            const fragment = yield tsDoc.getFragment();
            if (!fragment.isInGenerated(position)) {
                return null;
            }
            const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
            if (isJsDocTriggerCharacter) {
                return getJsDocTemplateCompletion_1.getJsDocTemplateCompletion(fragment, lang, filePath, offset);
            }
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return null;
            }
            const originalOffset = document.offsetAt(position);
            const wordRange = documents_1.getWordRangeAt(document.getText(), originalOffset, {
                left: /[^\s.]+$/,
                right: /[^\w$:]/
            });
            const eventAndSlotLetCompletions = yield this.getEventAndSlotLetCompletions(lang, document, tsDoc, position, wordRange);
            if (isEventOrSlotLetTriggerCharacter) {
                return vscode_languageserver_1.CompletionList.create(eventAndSlotLetCompletions, !!tsDoc.parserError);
            }
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return null;
            }
            const completions = ((_a = lang.getCompletionsAtPosition(filePath, offset, Object.assign(Object.assign({}, userPreferences), { triggerCharacter: validTriggerCharacter }))) === null || _a === void 0 ? void 0 : _a.entries) || [];
            if (completions.length === 0 && eventAndSlotLetCompletions.length === 0) {
                return tsDoc.parserError ? vscode_languageserver_1.CompletionList.create([], true) : null;
            }
            const existingImports = this.getExistingImports(document);
            const wordRangeStartPosition = document.positionAt(wordRange.start);
            const completionItems = completions
                .filter(isValidCompletion(document, position))
                .map((comp) => this.toCompletionItem(fragment, comp, utils_1.pathToUrl(tsDoc.filePath), position, existingImports))
                .filter(utils_1.isNotNullOrUndefined)
                .map((comp) => documents_1.mapCompletionItemToOriginal(fragment, comp))
                .map((comp) => this.fixTextEditRange(wordRangeStartPosition, comp))
                .concat(eventAndSlotLetCompletions);
            const completionList = vscode_languageserver_1.CompletionList.create(completionItems, !!tsDoc.parserError);
            this.lastCompletion = { key: document.getFilePath() || '', position, completionList };
            return completionList;
        });
    }
    canReuseLastCompletion(lastCompletion, triggerKind, triggerCharacter, document, position) {
        return (!!lastCompletion &&
            lastCompletion.key === document.getFilePath() &&
            lastCompletion.position.line === position.line &&
            ((Math.abs(lastCompletion.position.character - position.character) < 2 &&
                (triggerKind === vscode_languageserver_1.CompletionTriggerKind.TriggerForIncompleteCompletions ||
                    // Special case: `.` is a trigger character, but inside import path completions
                    // it shouldn't trigger another completion because we can reuse the old one
                    (triggerCharacter === '.' &&
                        utils_3.isPartOfImportStatement(document.getText(), position)))) ||
                // `let:` or `on:` -> up to 3 previous characters allowed
                (Math.abs(lastCompletion.position.character - position.character) < 4 &&
                    triggerCharacter === ':' &&
                    !!documents_1.getNodeIfIsInStartTag(document.html, document.offsetAt(position)))));
    }
    getExistingImports(document) {
        const rawImports = utils_1.getRegExpMatches(scriptImportRegex, document.getText()).map((match) => { var _a; return ((_a = match[1]) !== null && _a !== void 0 ? _a : match[2]).split(','); });
        const tidiedImports = utils_1.flatten(rawImports).map((match) => match.trim());
        return new Set(tidiedImports);
    }
    getEventAndSlotLetCompletions(lang, doc, tsDoc, originalPosition, wordRange) {
        return __awaiter(this, void 0, void 0, function* () {
            const componentInfo = yield utils_3.getComponentAtPosition(lang, doc, tsDoc, originalPosition);
            if (!componentInfo) {
                return [];
            }
            const { start, end } = wordRange;
            const events = componentInfo.getEvents().map((event) => mapToCompletionEntry(event, 'on:'));
            const slotLets = componentInfo
                .getSlotLets()
                .map((slot) => mapToCompletionEntry(slot, 'let:'));
            return [...events, ...slotLets];
            function mapToCompletionEntry(info, prefix) {
                const slotName = prefix + info.name;
                return {
                    label: slotName,
                    sortText: '-1',
                    detail: info.name + ': ' + info.type,
                    documentation: info.doc && { kind: vscode_languageserver_1.MarkupKind.Markdown, value: info.doc },
                    textEdit: start !== end
                        ? vscode_languageserver_1.TextEdit.replace(documents_1.toRange(doc.getText(), start, end), slotName)
                        : undefined
                };
            }
        });
    }
    toCompletionItem(fragment, comp, uri, position, existingImports) {
        const completionLabelAndInsert = this.getCompletionLabelAndInsert(fragment, comp);
        if (!completionLabelAndInsert) {
            return null;
        }
        const { label, insertText, isSvelteComp, replacementSpan } = completionLabelAndInsert;
        // TS may suggest another Svelte component even if there already exists an import
        // with the same name, because under the hood every Svelte component is postfixed
        // with `__SvelteComponent`. In this case, filter out this completion by returning null.
        if (isSvelteComp && existingImports.has(label)) {
            return null;
        }
        const textEdit = replacementSpan
            ? vscode_languageserver_1.TextEdit.replace(utils_2.convertRange(fragment, replacementSpan), insertText !== null && insertText !== void 0 ? insertText : label)
            : undefined;
        return {
            label,
            insertText,
            kind: utils_2.scriptElementKindToCompletionItemKind(comp.kind),
            commitCharacters: utils_2.getCommitCharactersForScriptElement(comp.kind),
            // Make sure svelte component takes precedence
            sortText: isSvelteComp ? '-1' : comp.sortText,
            preselect: isSvelteComp ? true : comp.isRecommended,
            textEdit,
            // pass essential data for resolving completion
            data: Object.assign(Object.assign({}, comp), { uri,
                position })
        };
    }
    getCompletionLabelAndInsert(fragment, comp) {
        let { name, insertText, kindModifiers } = comp;
        const isScriptElement = comp.kind === typescript_1.default.ScriptElementKind.scriptElement;
        const hasModifier = Boolean(comp.kindModifiers);
        const isSvelteComp = this.isSvelteComponentImport(name);
        if (isSvelteComp) {
            name = utils_2.changeSvelteComponentName(name);
            if (this.isExistingSvelteComponentImport(fragment, name, comp.source)) {
                return null;
            }
        }
        if (isScriptElement && hasModifier) {
            const label = kindModifiers && !name.endsWith(kindModifiers) ? name + kindModifiers : name;
            return {
                insertText: name,
                label,
                isSvelteComp
            };
        }
        if (comp.replacementSpan) {
            return {
                label: name,
                isSvelteComp,
                insertText: insertText ? utils_2.changeSvelteComponentName(insertText) : undefined,
                replacementSpan: comp.replacementSpan
            };
        }
        return {
            label: name,
            isSvelteComp
        };
    }
    isExistingSvelteComponentImport(fragment, name, source) {
        const importStatement = new RegExp(`import ${name} from ["'\`][\\s\\S]+\\.svelte["'\`]`);
        return !!source && !!fragment.text.match(importStatement);
    }
    /**
     * If the textEdit is out of the word range of the triggered position
     * vscode would refuse to show the completions
     * split those edits into additionalTextEdit to fix it
     */
    fixTextEditRange(wordRangePosition, completionItem) {
        const { textEdit } = completionItem;
        if (!textEdit || !vscode_languageserver_1.TextEdit.is(textEdit)) {
            return completionItem;
        }
        const { newText, range: { start } } = textEdit;
        const wordRangeStartCharacter = wordRangePosition.character;
        if (wordRangePosition.line !== wordRangePosition.line ||
            start.character > wordRangePosition.character) {
            return completionItem;
        }
        textEdit.newText = newText.substring(wordRangeStartCharacter - start.character);
        textEdit.range.start = {
            line: start.line,
            character: wordRangeStartCharacter
        };
        completionItem.additionalTextEdits = [
            vscode_languageserver_1.TextEdit.replace({
                start,
                end: {
                    line: start.line,
                    character: wordRangeStartCharacter
                }
            }, newText.substring(0, wordRangeStartCharacter - start.character))
        ];
        return completionItem;
    }
    /**
     * TypeScript throws a debug assertion error if the importModuleSpecifierEnding config is
     * 'js' and there's an unknown file extension - which is the case for `.svelte`. Therefore
     * rewrite the importModuleSpecifierEnding for this case to silence the error.
     */
    fixUserPreferencesForSvelteComponentImport(userPreferences) {
        if (userPreferences.importModuleSpecifierEnding === 'js') {
            return Object.assign(Object.assign({}, userPreferences), { importModuleSpecifierEnding: 'index' });
        }
        return userPreferences;
    }
    resolveCompletion(document, completionItem, cancellationToken) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { data: comp } = completionItem;
            const { tsDoc, lang, userPreferences } = yield this.lsAndTsDocResolver.getLSAndTSDoc(document);
            const filePath = tsDoc.filePath;
            if (!comp || !filePath || (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested)) {
                return completionItem;
            }
            const fragment = yield tsDoc.getFragment();
            const errorPreventingUserPreferences = ((_a = comp.source) === null || _a === void 0 ? void 0 : _a.endsWith('.svelte'))
                ? this.fixUserPreferencesForSvelteComponentImport(userPreferences)
                : userPreferences;
            const detail = lang.getCompletionEntryDetails(filePath, fragment.offsetAt(fragment.getGeneratedPosition(comp.position)), comp.name, {}, comp.source, errorPreventingUserPreferences, comp.data);
            if (detail) {
                const { detail: itemDetail, documentation: itemDocumentation } = this.getCompletionDocument(detail);
                completionItem.detail = itemDetail;
                completionItem.documentation = itemDocumentation;
            }
            const actions = detail === null || detail === void 0 ? void 0 : detail.codeActions;
            const isImport = !!(detail === null || detail === void 0 ? void 0 : detail.source);
            if (actions) {
                const edit = [];
                for (const action of actions) {
                    for (const change of action.changes) {
                        edit.push(...this.codeActionChangesToTextEdit(document, fragment, change, isImport, comp.position));
                    }
                }
                completionItem.additionalTextEdits = ((_b = completionItem.additionalTextEdits) !== null && _b !== void 0 ? _b : []).concat(edit);
            }
            return completionItem;
        });
    }
    getCompletionDocument(compDetail) {
        const { sourceDisplay, documentation: tsDocumentation, displayParts, tags } = compDetail;
        let detail = utils_2.changeSvelteComponentName(typescript_1.default.displayPartsToString(displayParts));
        if (sourceDisplay) {
            const importPath = typescript_1.default.displayPartsToString(sourceDisplay);
            detail = `Auto import from ${importPath}\n${detail}`;
        }
        const markdownDoc = previewer_1.getMarkdownDocumentation(tsDocumentation, tags);
        const documentation = markdownDoc
            ? { value: markdownDoc, kind: vscode_languageserver_1.MarkupKind.Markdown }
            : undefined;
        return {
            documentation,
            detail
        };
    }
    codeActionChangesToTextEdit(doc, fragment, changes, isImport, originalTriggerPosition) {
        return changes.textChanges.map((change) => this.codeActionChangeToTextEdit(doc, fragment, change, isImport, originalTriggerPosition));
    }
    codeActionChangeToTextEdit(doc, fragment, change, isImport, originalTriggerPosition) {
        var _a, _b, _c, _d;
        change.newText = this.changeComponentImport(change.newText, utils_2.isInScript(originalTriggerPosition, doc));
        const scriptTagInfo = fragment.scriptInfo || fragment.moduleScriptInfo;
        if (!scriptTagInfo) {
            // no script tag defined yet, add it.
            const lang = this.configManager.getConfig().liquivelte.defaultScriptLanguage;
            const scriptLang = lang === 'none' ? '' : ` lang="${lang}"`;
            return vscode_languageserver_1.TextEdit.replace(beginOfDocumentRange, `<script${scriptLang}>${typescript_1.default.sys.newLine}${change.newText}</script>${typescript_1.default.sys.newLine}`);
        }
        const { span } = change;
        const virtualRange = utils_2.convertRange(fragment, span);
        let range;
        const isNewImport = isImport && virtualRange.start.character === 0;
        // Since new import always can't be mapped, we'll have special treatment here
        //  but only hack this when there is multiple line in script
        if (isNewImport && virtualRange.start.line > 1) {
            range = this.mapRangeForNewImport(fragment, virtualRange);
        }
        else {
            range = documents_1.mapRangeToOriginal(fragment, virtualRange);
        }
        // If range is somehow not mapped in parent,
        // the import is mapped wrong or is outside script tag,
        // use script starting point instead.
        // This happens among other things if the completion is the first import of the file.
        if (range.start.line === -1 ||
            (range.start.line === 0 && range.start.character <= 1 && span.length === 0) ||
            !utils_2.isInScript(range.start, fragment)) {
            range = utils_2.convertRange(doc, {
                start: documents_1.isInTag(originalTriggerPosition, doc.scriptInfo)
                    ? ((_a = fragment.scriptInfo) === null || _a === void 0 ? void 0 : _a.start) || scriptTagInfo.start
                    : documents_1.isInTag(originalTriggerPosition, doc.moduleScriptInfo)
                        ? ((_b = fragment.moduleScriptInfo) === null || _b === void 0 ? void 0 : _b.start) || scriptTagInfo.start
                        : scriptTagInfo.start,
                length: span.length
            });
        }
        // prevent newText from being placed like this: <script>import {} from ''
        const editOffset = doc.offsetAt(range.start);
        if ((editOffset === ((_c = fragment.scriptInfo) === null || _c === void 0 ? void 0 : _c.start) ||
            editOffset === ((_d = fragment.moduleScriptInfo) === null || _d === void 0 ? void 0 : _d.start)) &&
            !change.newText.startsWith('\r\n') &&
            !change.newText.startsWith('\n')) {
            change.newText = typescript_1.default.sys.newLine + change.newText;
        }
        return vscode_languageserver_1.TextEdit.replace(range, change.newText);
    }
    mapRangeForNewImport(fragment, virtualRange) {
        const sourceMappableRange = this.offsetLinesAndMovetoStartOfLine(virtualRange, -1);
        const mappableRange = documents_1.mapRangeToOriginal(fragment, sourceMappableRange);
        return this.offsetLinesAndMovetoStartOfLine(mappableRange, 1);
    }
    offsetLinesAndMovetoStartOfLine({ start, end }, offsetLines) {
        return vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(start.line + offsetLines, 0), vscode_languageserver_1.Position.create(end.line + offsetLines, 0));
    }
    isSvelteComponentImport(className) {
        return className.endsWith('__SvelteComponent_');
    }
    changeComponentImport(importText, actionTriggeredInScript) {
        const changedName = utils_2.changeSvelteComponentName(importText);
        if (importText !== changedName || !actionTriggeredInScript) {
            // For some reason, TS sometimes adds the `type` modifier. Remove it
            // in case of Svelte component imports or if import triggered from markup.
            return changedName.replace(' type ', ' ');
        }
        return importText;
    }
}
exports.CompletionsProviderImpl = CompletionsProviderImpl;
const beginOfDocumentRange = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(0, 0));
// `import {...} from '..'` or `import ... from '..'`
// Note: Does not take into account if import is within a comment.
// eslint-disable-next-line max-len
const scriptImportRegex = /\bimport\s+{([^}]*?)}\s+?from\s+['"`].+?['"`]|\bimport\s+(\w+?)\s+from\s+['"`].+?['"`]/g;
// Type definitions from svelte-shims.d.ts that shouldn't appear in completion suggestions
// because they are meant to be used "behind the scenes"
const svelte2tsxTypes = new Set([
    'Svelte2TsxComponent',
    'Svelte2TsxComponentConstructorParameters',
    'SvelteComponentConstructor',
    'SvelteActionReturnType',
    'SvelteTransitionConfig',
    'SvelteTransitionReturnType',
    'SvelteAnimationReturnType',
    'SvelteWithOptionalProps',
    'SvelteAllProps',
    'SveltePropsAnyFallback',
    'SvelteSlotsAnyFallback',
    'SvelteRestProps',
    'SvelteSlots',
    'SvelteStore'
]);
function isValidCompletion(document, position) {
    const isNoSvelte2tsxCompletion = (value) => value.kindModifiers !== 'declare' ||
        (!value.name.startsWith('__sveltets_') && !svelte2tsxTypes.has(value.name));
    const isCompletionInHTMLStartTag = !!documents_1.getNodeIfIsInHTMLStartTag(document.html, document.offsetAt(position));
    if (!isCompletionInHTMLStartTag) {
        return isNoSvelte2tsxCompletion;
    }
    return (value) => 
    // Remove jsx attributes on html tags because they are doubled by the HTML
    // attribute suggestions, and for events they are wrong (onX instead of on:X).
    // Therefore filter them out.
    value.kind !== typescript_1.default.ScriptElementKind.jsxAttribute && isNoSvelte2tsxCompletion(value);
}
//# sourceMappingURL=CompletionProvider.js.map