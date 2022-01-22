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
exports.SelectionRangeProviderImpl = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../utils");
class SelectionRangeProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    getSelectionRange(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tsDoc, lang } = yield this.lsAndTsDocResolver.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const tsSelectionRange = lang.getSmartSelectionRange(tsDoc.filePath, fragment.offsetAt(fragment.getGeneratedPosition(position)));
            const selectionRange = this.toSelectionRange(fragment, tsSelectionRange);
            const mappedRange = documents_1.mapSelectionRangeToParent(fragment, selectionRange);
            return this.filterOutUnmappedRange(mappedRange);
        });
    }
    toSelectionRange(fragment, { textSpan, parent }) {
        return {
            range: utils_1.convertRange(fragment, textSpan),
            parent: parent && this.toSelectionRange(fragment, parent)
        };
    }
    filterOutUnmappedRange(selectionRange) {
        const flattened = this.flattenAndReverseSelectionRange(selectionRange);
        const filtered = flattened.filter((range) => range.start.line > 0 && range.end.line > 0);
        if (!filtered.length) {
            return null;
        }
        let result;
        for (const selectionRange of filtered) {
            result = vscode_languageserver_1.SelectionRange.create(selectionRange, result);
        }
        return result !== null && result !== void 0 ? result : null;
    }
    /**
     *   flatten the selection range and its parent to an array in reverse order
     * so it's easier to filter out unmapped selection and create a new tree of
     * selection range
     */
    flattenAndReverseSelectionRange(selectionRange) {
        const result = [];
        let current = selectionRange;
        while (current.parent) {
            result.unshift(current.range);
            current = current.parent;
        }
        return result;
    }
}
exports.SelectionRangeProviderImpl = SelectionRangeProviderImpl;
//# sourceMappingURL=SelectionRangeProvider.js.map