import { MarkupContent } from 'vscode-languageserver';
export interface ModifierData {
    modifier: string;
    documentation: MarkupContent;
    modifiersInvalidWith?: string[];
}
export declare function getModifierData(): ModifierData[];
