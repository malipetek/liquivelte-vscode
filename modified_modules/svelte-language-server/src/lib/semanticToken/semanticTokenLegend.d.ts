import { SemanticTokensLegend } from 'vscode-languageserver';
/**
 * extended from https://github.com/microsoft/TypeScript/blob/35c8df04ad959224fad9037e340c1e50f0540a49/src/services/classifier2020.ts#L9
 * so that we don't have to map it into our own legend
 */
export declare const enum TokenType {
    class = 0,
    enum = 1,
    interface = 2,
    namespace = 3,
    typeParameter = 4,
    type = 5,
    parameter = 6,
    variable = 7,
    enumMember = 8,
    property = 9,
    function = 10,
    member = 11,
    event = 12
}
/**
 * adopted from https://github.com/microsoft/TypeScript/blob/35c8df04ad959224fad9037e340c1e50f0540a49/src/services/classifier2020.ts#L13
 * so that we don't have to map it into our own legend
 */
export declare const enum TokenModifier {
    declaration = 0,
    static = 1,
    async = 2,
    readonly = 3,
    defaultLibrary = 4,
    local = 5
}
export declare function getSemanticTokenLegends(): SemanticTokensLegend;
