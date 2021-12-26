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
exports.ImplementationProviderImpl = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../../../utils");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
class ImplementationProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    getImplementation(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tsDoc, lang } = yield this.lsAndTsDocResolver.getLSAndTSDoc(document);
            const mainFragment = yield tsDoc.getFragment();
            const offset = mainFragment.offsetAt(mainFragment.getGeneratedPosition(position));
            const implementations = lang.getImplementationAtPosition(tsDoc.filePath, offset);
            const docs = new utils_3.SnapshotFragmentMap(this.lsAndTsDocResolver);
            docs.set(tsDoc.filePath, { fragment: mainFragment, snapshot: tsDoc });
            if (!implementations) {
                return null;
            }
            const result = yield Promise.all(implementations.map((implementation) => __awaiter(this, void 0, void 0, function* () {
                const { fragment, snapshot } = yield docs.retrieve(implementation.fileName);
                if (!utils_3.isNoTextSpanInGeneratedCode(snapshot.getFullText(), implementation.textSpan)) {
                    return;
                }
                const range = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, implementation.textSpan));
                if (range.start.line > 0 && range.end.line > 0) {
                    return vscode_languageserver_protocol_1.Location.create(utils_1.pathToUrl(implementation.fileName), range);
                }
            })));
            return result.filter(utils_1.isNotNullOrUndefined);
        });
    }
}
exports.ImplementationProviderImpl = ImplementationProviderImpl;
//# sourceMappingURL=ImplementationProvider.js.map