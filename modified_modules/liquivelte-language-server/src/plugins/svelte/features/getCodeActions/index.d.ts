import { CodeAction, CodeActionContext, Range, WorkspaceEdit } from 'vscode-languageserver';
import { SvelteDocument } from '../../SvelteDocument';
export declare function getCodeActions(svelteDoc: SvelteDocument, range: Range, context: CodeActionContext): Promise<CodeAction[]>;
export declare function executeCommand(svelteDoc: SvelteDocument, command: string, args?: any[]): Promise<WorkspaceEdit | string | null>;
