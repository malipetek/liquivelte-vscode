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
exports.getSelectionRange = void 0;
const estree_walker_1 = require("estree-walker");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
function getSelectionRange(svelteDoc, position) {
    return __awaiter(this, void 0, void 0, function* () {
        const { script, style, moduleScript } = svelteDoc;
        const { ast: { html } } = yield svelteDoc.getCompiled();
        const transpiled = yield svelteDoc.getTranspiled();
        const content = transpiled.getText();
        const offset = documents_1.offsetAt(transpiled.getGeneratedPosition(position), content);
        const embedded = [script, style, moduleScript];
        for (const info of embedded) {
            if (documents_1.isInTag(position, info)) {
                // let other plugins do it
                return null;
            }
        }
        let nearest = html;
        let result;
        estree_walker_1.walk(html, {
            enter(node, parent) {
                if (!parent) {
                    // keep looking
                    return;
                }
                if (!('start' in node && 'end' in node)) {
                    this.skip();
                    return;
                }
                const { start, end } = node;
                const isWithin = start <= offset && end >= offset;
                if (!isWithin) {
                    this.skip();
                    return;
                }
                if (nearest === parent) {
                    nearest = node;
                    result = createSelectionRange(node, result);
                }
            }
        });
        return result ? documents_1.mapSelectionRangeToParent(transpiled, result) : null;
        function createSelectionRange(node, parent) {
            const range = documents_1.toRange(content, node.start, node.end);
            return vscode_languageserver_1.SelectionRange.create(range, parent);
        }
    });
}
exports.getSelectionRange = getSelectionRange;
//# sourceMappingURL=getSelectionRanges.js.map