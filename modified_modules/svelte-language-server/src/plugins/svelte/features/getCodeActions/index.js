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
exports.executeCommand = exports.getCodeActions = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const getQuickfixes_1 = require("./getQuickfixes");
const getRefactorings_1 = require("./getRefactorings");
function getCodeActions(svelteDoc, range, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const svelteDiagnostics = context.diagnostics.filter(getQuickfixes_1.isIgnorableSvelteDiagnostic);
        if (svelteDiagnostics.length &&
            (!context.only || context.only.includes(vscode_languageserver_1.CodeActionKind.QuickFix))) {
            return yield getQuickfixes_1.getQuickfixActions(svelteDoc, svelteDiagnostics);
        }
        return [];
    });
}
exports.getCodeActions = getCodeActions;
function executeCommand(svelteDoc, command, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getRefactorings_1.executeRefactoringCommand(svelteDoc, command, args);
    });
}
exports.executeCommand = executeCommand;
//# sourceMappingURL=index.js.map