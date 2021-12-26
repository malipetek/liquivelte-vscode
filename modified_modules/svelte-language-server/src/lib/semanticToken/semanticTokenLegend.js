"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSemanticTokenLegends = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
function getSemanticTokenLegends() {
    const tokenModifiers = [];
    [
        [0 /* declaration */, vscode_languageserver_1.SemanticTokenModifiers.declaration],
        [1 /* static */, vscode_languageserver_1.SemanticTokenModifiers.static],
        [2 /* async */, vscode_languageserver_1.SemanticTokenModifiers.async],
        [3 /* readonly */, vscode_languageserver_1.SemanticTokenModifiers.readonly],
        [4 /* defaultLibrary */, vscode_languageserver_1.SemanticTokenModifiers.defaultLibrary],
        [5 /* local */, 'local']
    ].forEach(([tsModifier, legend]) => (tokenModifiers[tsModifier] = legend));
    const tokenTypes = [];
    [
        [0 /* class */, vscode_languageserver_1.SemanticTokenTypes.class],
        [1 /* enum */, vscode_languageserver_1.SemanticTokenTypes.enum],
        [2 /* interface */, vscode_languageserver_1.SemanticTokenTypes.interface],
        [3 /* namespace */, vscode_languageserver_1.SemanticTokenTypes.namespace],
        [4 /* typeParameter */, vscode_languageserver_1.SemanticTokenTypes.typeParameter],
        [5 /* type */, vscode_languageserver_1.SemanticTokenTypes.type],
        [6 /* parameter */, vscode_languageserver_1.SemanticTokenTypes.parameter],
        [7 /* variable */, vscode_languageserver_1.SemanticTokenTypes.variable],
        [8 /* enumMember */, vscode_languageserver_1.SemanticTokenTypes.enumMember],
        [9 /* property */, vscode_languageserver_1.SemanticTokenTypes.property],
        [10 /* function */, vscode_languageserver_1.SemanticTokenTypes.function],
        // member is renamed to method in vscode codebase to match LSP default
        [11 /* member */, vscode_languageserver_1.SemanticTokenTypes.method],
        [12 /* event */, vscode_languageserver_1.SemanticTokenTypes.event]
    ].forEach(([tokenType, legend]) => (tokenTypes[tokenType] = legend));
    return {
        tokenModifiers,
        tokenTypes
    };
}
exports.getSemanticTokenLegends = getSemanticTokenLegends;
//# sourceMappingURL=semanticTokenLegend.js.map