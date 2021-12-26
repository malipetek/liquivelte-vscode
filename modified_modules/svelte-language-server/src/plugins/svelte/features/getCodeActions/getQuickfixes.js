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
exports.isIgnorableSvelteDiagnostic = exports.getQuickfixActions = void 0;
const estree_walker_1 = require("estree-walker");
const os_1 = require("os");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../../lib/documents");
const utils_1 = require("../../../../utils");
/**
 * Get applicable quick fixes.
 */
function getQuickfixActions(svelteDoc, svelteDiagnostics) {
    return __awaiter(this, void 0, void 0, function* () {
        const { ast } = yield svelteDoc.getCompiled();
        return Promise.all(svelteDiagnostics.map((diagnostic) => __awaiter(this, void 0, void 0, function* () { return yield createQuickfixAction(diagnostic, svelteDoc, ast); })));
    });
}
exports.getQuickfixActions = getQuickfixActions;
function createQuickfixAction(diagnostic, svelteDoc, ast) {
    return __awaiter(this, void 0, void 0, function* () {
        const textDocument = vscode_languageserver_1.OptionalVersionedTextDocumentIdentifier.create(utils_1.pathToUrl(svelteDoc.getFilePath()), null);
        return vscode_languageserver_1.CodeAction.create(getCodeActionTitle(diagnostic), {
            documentChanges: [
                vscode_languageserver_1.TextDocumentEdit.create(textDocument, [
                    yield getSvelteIgnoreEdit(svelteDoc, ast, diagnostic)
                ])
            ]
        }, vscode_languageserver_1.CodeActionKind.QuickFix);
    });
}
function getCodeActionTitle(diagnostic) {
    // make it distinguishable with eslint's code action
    return `(svelte) Disable ${diagnostic.code} for this line`;
}
/**
 * Whether or not the given diagnostic can be ignored via a
 * <!-- svelte-ignore <code> -->
 */
function isIgnorableSvelteDiagnostic(diagnostic) {
    const { source, severity, code } = diagnostic;
    return (code &&
        !nonIgnorableWarnings.includes(code) &&
        source === 'svelte' &&
        severity !== vscode_languageserver_1.DiagnosticSeverity.Error);
}
exports.isIgnorableSvelteDiagnostic = isIgnorableSvelteDiagnostic;
const nonIgnorableWarnings = [
    'missing-custom-element-compile-options',
    'unused-export-let',
    'css-unused-selector'
];
function getSvelteIgnoreEdit(svelteDoc, ast, diagnostic) {
    return __awaiter(this, void 0, void 0, function* () {
        const { code, range: { start, end } } = diagnostic;
        const transpiled = yield svelteDoc.getTranspiled();
        const content = transpiled.getText();
        const { html } = ast;
        const generatedStart = transpiled.getGeneratedPosition(start);
        const generatedEnd = transpiled.getGeneratedPosition(end);
        const diagnosticStartOffset = documents_1.offsetAt(generatedStart, transpiled.getText());
        const diagnosticEndOffset = documents_1.offsetAt(generatedEnd, transpiled.getText());
        const offsetRange = {
            pos: diagnosticStartOffset,
            end: diagnosticEndOffset
        };
        const node = findTagForRange(html, offsetRange);
        const nodeStartPosition = documents_1.positionAt(node.start, content);
        const nodeLineStart = documents_1.offsetAt({
            line: nodeStartPosition.line,
            character: 0
        }, transpiled.getText());
        const afterStartLineStart = content.slice(nodeLineStart);
        const indent = utils_1.getIndent(afterStartLineStart);
        // TODO: Make all code action's new line consistent
        const ignore = `${indent}<!-- svelte-ignore ${code} -->${os_1.EOL}`;
        const position = vscode_languageserver_1.Position.create(nodeStartPosition.line, 0);
        return documents_1.mapObjWithRangeToOriginal(transpiled, vscode_languageserver_1.TextEdit.insert(position, ignore));
    });
}
const elementOrComponent = ['Component', 'Element', 'InlineComponent'];
function findTagForRange(html, range) {
    let nearest = html;
    estree_walker_1.walk(html, {
        enter(node, parent) {
            const { type } = node;
            const isBlock = 'block' in node || node.type.toLowerCase().includes('block');
            const isFragment = type === 'Fragment';
            const keepLooking = isFragment || elementOrComponent.includes(type) || isBlock;
            if (!keepLooking) {
                this.skip();
                return;
            }
            if (within(node, range) && parent === nearest) {
                nearest = node;
            }
        }
    });
    return nearest;
}
function within(node, range) {
    return node.end >= range.end && node.start <= range.pos;
}
//# sourceMappingURL=getQuickfixes.js.map