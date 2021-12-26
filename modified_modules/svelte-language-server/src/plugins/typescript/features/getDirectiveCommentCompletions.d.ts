import { Document } from '../../../lib/documents';
import { Position, CompletionList, CompletionContext } from 'vscode-languageserver';
/**
 * from https://github.com/microsoft/vscode/blob/157255fa4b0775c5ab8729565faf95927b610cac/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L19
 */
export declare const tsDirectives: {
    value: string;
    description: string;
}[];
/**
 * from https://github.com/microsoft/vscode/blob/157255fa4b0775c5ab8729565faf95927b610cac/extensions/typescript-language-features/src/languageFeatures/directiveCommentCompletions.ts#L64
 */
export declare function getDirectiveCommentCompletions(position: Position, document: Document, completionContext: CompletionContext | undefined): CompletionList | null;
