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
exports.UpdateImportsProviderImpl = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../../../utils");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
class UpdateImportsProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    updateImports(fileRename) {
        return __awaiter(this, void 0, void 0, function* () {
            const oldPath = utils_1.urlToPath(fileRename.oldUri);
            const newPath = utils_1.urlToPath(fileRename.newUri);
            if (!oldPath || !newPath) {
                return null;
            }
            const ls = yield this.getLSForPath(newPath);
            // `getEditsForFileRename` might take a while
            const fileChanges = ls.getEditsForFileRename(oldPath, newPath, {}, {});
            yield this.lsAndTsDocResolver.updateSnapshotPath(oldPath, newPath);
            const updateImportsChanges = fileChanges
                // Assumption: Updating imports will not create new files, and to make sure just filter those out
                // who - for whatever reason - might be new ones.
                .filter((change) => !change.isNewFile || change.fileName === oldPath)
                // The language service might want to do edits to the old path, not the new path -> rewire it.
                // If there is a better solution for this, please file a PR :)
                .map((change) => {
                change.fileName = change.fileName.replace(oldPath, newPath);
                return change;
            });
            const docs = new utils_3.SnapshotFragmentMap(this.lsAndTsDocResolver);
            const documentChanges = yield Promise.all(updateImportsChanges.map((change) => __awaiter(this, void 0, void 0, function* () {
                const fragment = yield docs.retrieveFragment(change.fileName);
                return vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(fragment.getURL(), null), change.textChanges.map((edit) => {
                    const range = documents_1.mapRangeToOriginal(fragment, utils_2.convertRange(fragment, edit.span));
                    return vscode_languageserver_1.TextEdit.replace(range, edit.newText);
                }));
            })));
            return { documentChanges };
        });
    }
    getLSForPath(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSForPath(path);
        });
    }
}
exports.UpdateImportsProviderImpl = UpdateImportsProviderImpl;
//# sourceMappingURL=UpdateImportsProvider.js.map