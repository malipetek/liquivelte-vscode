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
exports.RenameProviderImpl = void 0;
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../../../utils");
const DocumentSnapshot_1 = require("../DocumentSnapshot");
const utils_2 = require("../utils");
const typescript_1 = require("typescript");
const lodash_1 = require("lodash");
const utils_3 = require("./utils");
class RenameProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    // TODO props written as `export {x as y}` are not supported yet.
    prepareRename(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
            const renameInfo = this.getRenameInfo(lang, tsDoc, document, position, offset);
            if (!renameInfo) {
                return null;
            }
            return this.mapRangeToOriginal(fragment, renameInfo.triggerSpan);
        });
    }
    rename(document, position, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
            if (!this.getRenameInfo(lang, tsDoc, document, position, offset)) {
                return null;
            }
            const renameLocations = lang.findRenameLocations(tsDoc.filePath, offset, false, false, true);
            if (!renameLocations) {
                return null;
            }
            const docs = new utils_3.SnapshotFragmentMap(this.lsAndTsDocResolver);
            docs.set(tsDoc.filePath, { fragment, snapshot: tsDoc });
            let convertedRenameLocations = yield this.mapAndFilterRenameLocations(renameLocations, docs);
            convertedRenameLocations = this.checkShortHandBindingOrSlotLetLocation(lang, convertedRenameLocations, docs);
            const additionalRenameForPropRenameInsideComponentWithProp = yield this.getAdditionLocationsForRenameOfPropInsideComponentWithProp(document, tsDoc, fragment, position, convertedRenameLocations, docs, lang);
            const additionalRenamesForPropRenameOutsideComponentWithProp = 
            // This is an either-or-situation, don't do both
            additionalRenameForPropRenameInsideComponentWithProp.length > 0
                ? []
                : yield this.getAdditionalLocationsForRenameOfPropInsideOtherComponent(convertedRenameLocations, docs, lang);
            convertedRenameLocations = [
                ...convertedRenameLocations,
                ...additionalRenameForPropRenameInsideComponentWithProp,
                ...additionalRenamesForPropRenameOutsideComponentWithProp
            ];
            return unique(convertedRenameLocations.filter((loc) => loc.range.start.line >= 0 && loc.range.end.line >= 0)).reduce((acc, loc) => {
                const uri = utils_1.pathToUrl(loc.fileName);
                if (!acc.changes[uri]) {
                    acc.changes[uri] = [];
                }
                acc.changes[uri].push({
                    newText: (loc.prefixText || '') + newName + (loc.suffixText || ''),
                    range: loc.range
                });
                return acc;
            }, { changes: {} });
        });
    }
    getRenameInfo(lang, tsDoc, doc, originalPosition, generatedOffset) {
        var _a;
        // Don't allow renames in error-state, because then there is no generated svelte2tsx-code
        // and rename cannot work
        if (tsDoc.parserError) {
            return null;
        }
        const renameInfo = lang.getRenameInfo(tsDoc.filePath, generatedOffset, {
            allowRenameOfImportPath: false
        });
        if (!renameInfo.canRename ||
            ((_a = renameInfo.fullDisplayName) === null || _a === void 0 ? void 0 : _a.includes('JSX.IntrinsicElements')) ||
            (renameInfo.kind === typescript_1.default.ScriptElementKind.jsxAttribute &&
                !utils_3.isComponentAtPosition(doc, tsDoc, originalPosition))) {
            return null;
        }
        return renameInfo;
    }
    /**
     * If user renames prop of component A inside component A,
     * we need to handle the rename of the prop of A ourselves.
     * Reason: the rename will do {oldPropName: newPropName}, meaning
     * the rename will not propagate further, so we have to handle
     * the conversion to {newPropName: newPropName} ourselves.
     */
    getAdditionLocationsForRenameOfPropInsideComponentWithProp(document, tsDoc, fragment, position, convertedRenameLocations, fragments, lang) {
        return __awaiter(this, void 0, void 0, function* () {
            // First find out if it's really the "rename prop inside component with that prop" case
            // Use original document for that because only there the `export` is present.
            const regex = new RegExp(`export\\s+let\\s+${this.getVariableAtPosition(tsDoc, fragment, lang, position)}($|\\s|;|:)` // ':' for typescript's type operator (`export let bla: boolean`)
            );
            const isRenameInsideComponentWithProp = regex.test(documents_1.getLineAtPosition(position, document.getText()));
            if (!isRenameInsideComponentWithProp) {
                return [];
            }
            // We now know that the rename happens at `export let X` -> let's find the corresponding
            // prop rename further below in the document.
            const updatePropLocation = this.findLocationWhichWantsToUpdatePropName(convertedRenameLocations, fragments);
            if (!updatePropLocation) {
                return [];
            }
            // Typescript does a rename of `oldPropName: newPropName` -> find oldPropName and rename that, too.
            const idxOfOldPropName = fragment.text.lastIndexOf(':', updatePropLocation.textSpan.start);
            // This requires svelte2tsx to have the properties written down like `return props: {bla: bla}`.
            // It would not work for `return props: {bla}` because then typescript would do a rename of `{bla: renamed}`,
            // so other locations would not be affected.
            const replacementsForProp = (lang.findRenameLocations(updatePropLocation.fileName, idxOfOldPropName, false, false) ||
                []).filter((rename) => 
            // filter out all renames inside the component except the prop rename,
            // because the others were done before and then would show up twice, making a wrong rename.
            rename.fileName !== updatePropLocation.fileName ||
                this.isInSvelte2TsxPropLine(fragment, rename));
            return yield this.mapAndFilterRenameLocations(replacementsForProp, fragments);
        });
    }
    /**
     * If user renames prop of component A inside component B,
     * we need to handle the rename of the prop of A ourselves.
     * Reason: the rename will rename the prop in the computed svelte2tsx code,
     * but not the `export let X` code in the original because the
     * rename does not propagate further than the prop.
     * This additional logic/propagation is done in this method.
     */
    getAdditionalLocationsForRenameOfPropInsideOtherComponent(convertedRenameLocations, fragments, lang) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if it's a prop rename
            const updatePropLocation = this.findLocationWhichWantsToUpdatePropName(convertedRenameLocations, fragments);
            if (!updatePropLocation) {
                return [];
            }
            // Find generated `export let`
            const doc = fragments.getFragment(updatePropLocation.fileName);
            const match = this.matchGeneratedExportLet(doc, updatePropLocation);
            if (!match) {
                return [];
            }
            // Use match to replace that let, too.
            const idx = (match.index || 0) + match[0].lastIndexOf(match[1]);
            const replacementsForProp = lang.findRenameLocations(updatePropLocation.fileName, idx, false, false) || [];
            return this.checkShortHandBindingOrSlotLetLocation(lang, yield this.mapAndFilterRenameLocations(replacementsForProp, fragments), fragments);
        });
    }
    // --------> svelte2tsx?
    matchGeneratedExportLet(fragment, updatePropLocation) {
        const regex = new RegExp(
        // no 'export let', only 'let', because that's what it's translated to in svelte2tsx
        `\\s+let\\s+(${fragment.text.substr(updatePropLocation.textSpan.start, updatePropLocation.textSpan.length)})($|\\s|;|:)`);
        const match = fragment.text.match(regex);
        return match;
    }
    findLocationWhichWantsToUpdatePropName(convertedRenameLocations, fragments) {
        return convertedRenameLocations.find((loc) => {
            // Props are not in mapped range
            if (loc.range.start.line >= 0 && loc.range.end.line >= 0) {
                return;
            }
            const fragment = fragments.getFragment(loc.fileName);
            // Props are in svelte snapshots only
            if (!(fragment instanceof DocumentSnapshot_1.SvelteSnapshotFragment)) {
                return false;
            }
            return this.isInSvelte2TsxPropLine(fragment, loc);
        });
    }
    // --------> svelte2tsx?
    isInSvelte2TsxPropLine(fragment, loc) {
        return utils_3.isAfterSvelte2TsxPropsReturn(fragment.text, loc.textSpan.start);
    }
    /**
     * The rename locations the ts language services hands back are relative to the
     * svelte2tsx generated code -> map it back to the original document positions.
     * Some of those positions could be unmapped (line=-1), these are handled elsewhere.
     * Also filter out wrong renames.
     */
    mapAndFilterRenameLocations(renameLocations, fragments) {
        return __awaiter(this, void 0, void 0, function* () {
            const mappedLocations = yield Promise.all(renameLocations.map((loc) => __awaiter(this, void 0, void 0, function* () {
                const { fragment, snapshot } = yield fragments.retrieve(loc.fileName);
                if (utils_3.isNoTextSpanInGeneratedCode(snapshot.getFullText(), loc.textSpan)) {
                    return Object.assign(Object.assign({}, loc), { range: this.mapRangeToOriginal(fragment, loc.textSpan) });
                }
            })));
            return this.filterWrongRenameLocations(mappedLocations.filter(utils_1.isNotNullOrUndefined));
        });
    }
    filterWrongRenameLocations(mappedLocations) {
        return utils_1.filterAsync(mappedLocations, (loc) => __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.getSnapshot(loc.fileName);
            if (!(snapshot instanceof DocumentSnapshot_1.SvelteDocumentSnapshot)) {
                return true;
            }
            const content = snapshot.getText(0, snapshot.getLength());
            // When the user renames a Svelte component, ts will also want to rename
            // `__sveltets_1_instanceOf(TheComponentToRename)` or
            // `__sveltets_1_ensureType(TheComponentToRename,..`. Prevent that.
            // Additionally, we cannot rename the hidden variable containing the store value
            return (notPrecededBy('__sveltets_1_instanceOf(') &&
                notPrecededBy('__sveltets_1_ensureType(') &&
                notPrecededBy('= __sveltets_1_store_get('));
            function notPrecededBy(str) {
                return (content.lastIndexOf(str, loc.textSpan.start) !== loc.textSpan.start - str.length);
            }
        }));
    }
    mapRangeToOriginal(doc, textSpan) {
        // We need to work around a current svelte2tsx limitation: Replacements and
        // source mapping is done in such a way that sometimes the end of the range is unmapped
        // and the index of the last character is returned instead (which is one less).
        // Most of the time this is not much of a problem, but in the context of renaming, it is.
        // We work around that by adding +1 to the end, if necessary.
        // This can be done because
        // 1. we know renames can only ever occur in one line
        // 2. the generated svelte2tsx code will not modify variable names, so we know
        //    the original range should be the same length as the textSpan's length
        const range = documents_1.mapRangeToOriginal(doc, utils_2.convertRange(doc, textSpan));
        if (range.end.character - range.start.character < textSpan.length) {
            range.end.character++;
        }
        return range;
    }
    getVariableAtPosition(tsDoc, fragment, lang, position) {
        const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
        const { start, length } = lang.getSmartSelectionRange(tsDoc.filePath, offset).textSpan;
        return tsDoc.getText(start, start + length);
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
    getSnapshot(filePath) {
        return this.lsAndTsDocResolver.getSnapshot(filePath);
    }
    checkShortHandBindingOrSlotLetLocation(lang, renameLocations, fragments) {
        const bind = 'bind:';
        return renameLocations.map((location) => {
            var _a, _b;
            const sourceFile = (_a = lang.getProgram()) === null || _a === void 0 ? void 0 : _a.getSourceFile(location.fileName);
            if (!sourceFile ||
                location.fileName !== sourceFile.fileName ||
                location.range.start.line < 0 ||
                location.range.end.line < 0) {
                return location;
            }
            const fragment = fragments.getFragment(location.fileName);
            if (!(fragment instanceof DocumentSnapshot_1.SvelteSnapshotFragment)) {
                return location;
            }
            const { originalText } = fragment;
            const renamingInfo = (_b = this.getShorthandPropInfo(sourceFile, location)) !== null && _b !== void 0 ? _b : this.getSlotLetInfo(sourceFile, location);
            if (!renamingInfo) {
                return location;
            }
            const [renamingNode, identifierName] = renamingInfo;
            const originalStart = documents_1.offsetAt(location.range.start, originalText);
            const isShortHandBinding = originalText.substr(originalStart - bind.length, bind.length) === bind;
            const directiveName = (isShortHandBinding ? bind : '') + identifierName;
            const prefixText = directiveName + '={';
            const newRange = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, {
                start: renamingNode.getStart(),
                length: renamingNode.getWidth()
            }));
            // somehow the mapping is one character before
            if (isShortHandBinding ||
                originalText
                    .substring(documents_1.offsetAt(newRange.start, originalText), originalStart)
                    .trimLeft() === '{') {
                newRange.start.character++;
            }
            return Object.assign(Object.assign({}, location), { prefixText, suffixText: '}', range: newRange });
        });
    }
    getShorthandPropInfo(sourceFile, location) {
        var _a;
        const possibleJsxAttribute = utils_3.findContainingNode(sourceFile, location.textSpan, typescript_1.default.isJsxAttribute);
        if (!possibleJsxAttribute) {
            return null;
        }
        const attributeName = possibleJsxAttribute.name.getText();
        const { initializer } = possibleJsxAttribute;
        // not props={props}
        if (!initializer ||
            !typescript_1.default.isJsxExpression(initializer) ||
            attributeName !== ((_a = initializer.expression) === null || _a === void 0 ? void 0 : _a.getText())) {
            return null;
        }
        return [possibleJsxAttribute, attributeName];
    }
    getSlotLetInfo(sourceFile, location) {
        const possibleSlotLet = utils_3.findContainingNode(sourceFile, location.textSpan, typescript_1.default.isVariableDeclaration);
        if (!possibleSlotLet || !typescript_1.default.isObjectBindingPattern(possibleSlotLet.name)) {
            return null;
        }
        const bindingElement = utils_3.findContainingNode(possibleSlotLet.name, location.textSpan, typescript_1.default.isBindingElement);
        if (!bindingElement || bindingElement.propertyName) {
            return null;
        }
        const identifierName = bindingElement.name.getText();
        return [bindingElement, identifierName];
    }
}
exports.RenameProviderImpl = RenameProviderImpl;
function unique(array) {
    return lodash_1.uniqWith(array, lodash_1.isEqual);
}
//# sourceMappingURL=RenameProvider.js.map