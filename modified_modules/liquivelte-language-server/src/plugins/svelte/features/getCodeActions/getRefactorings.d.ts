import { Range, WorkspaceEdit } from 'vscode-languageserver';
import { SvelteDocument } from '../../SvelteDocument';
export interface ExtractComponentArgs {
    uri: string;
    range: Range;
    filePath: string;
}
export declare const extractComponentCommand = "extract_to_svelte_component";
export declare function executeRefactoringCommand(svelteDoc: SvelteDocument, command: string, args?: any[]): Promise<WorkspaceEdit | string | null>;
