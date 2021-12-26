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
exports.FindReferencesProviderImpl = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const utils_1 = require("../../../utils");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
class FindReferencesProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    findReferences(document, position, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const references = lang.getReferencesAtPosition(tsDoc.filePath, fragment.offsetAt(fragment.getGeneratedPosition(position)));
            if (!references) {
                return null;
            }
            const docs = new utils_3.SnapshotFragmentMap(this.lsAndTsDocResolver);
            docs.set(tsDoc.filePath, { fragment, snapshot: tsDoc });
            const locations = yield Promise.all(references
                .filter((ref) => context.includeDeclaration || !ref.isDefinition)
                .filter(notInGeneratedCode(tsDoc.getFullText()))
                .map((ref) => __awaiter(this, void 0, void 0, function* () {
                const defDoc = yield docs.retrieveFragment(ref.fileName);
                return vscode_languageserver_1.Location.create(utils_1.pathToUrl(ref.fileName), utils_2.convertToLocationRange(defDoc, ref.textSpan));
            })));
            // Some references are in generated code but not wrapped with explicit ignore comments.
            // These show up as zero-length ranges, so filter them out.
            return locations.filter(utils_2.hasNonZeroRange);
        });
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
}
exports.FindReferencesProviderImpl = FindReferencesProviderImpl;
function notInGeneratedCode(text) {
    return (ref) => {
        return utils_3.isNoTextSpanInGeneratedCode(text, ref.textSpan);
    };
}
//# sourceMappingURL=FindReferencesProvider.js.map