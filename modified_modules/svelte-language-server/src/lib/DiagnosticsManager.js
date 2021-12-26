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
exports.DiagnosticsManager = void 0;
class DiagnosticsManager {
    constructor(sendDiagnostics, docManager, getDiagnostics) {
        this.sendDiagnostics = sendDiagnostics;
        this.docManager = docManager;
        this.getDiagnostics = getDiagnostics;
    }
    updateAll() {
        this.docManager.getAllOpenedByClient().forEach((doc) => {
            this.update(doc[1]);
        });
    }
    update(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const diagnostics = yield this.getDiagnostics({ uri: document.getURL() });
            this.sendDiagnostics({
                uri: document.getURL(),
                diagnostics
            });
        });
    }
    removeDiagnostics(document) {
        this.sendDiagnostics({
            uri: document.getURL(),
            diagnostics: []
        });
    }
}
exports.DiagnosticsManager = DiagnosticsManager;
//# sourceMappingURL=DiagnosticsManager.js.map