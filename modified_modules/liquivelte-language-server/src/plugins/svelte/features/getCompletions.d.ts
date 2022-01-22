import { SvelteDocument } from '../SvelteDocument';
import { Position, CompletionList } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
export declare function getCompletions(document: Document, svelteDoc: SvelteDocument, position: Position): CompletionList | null;
