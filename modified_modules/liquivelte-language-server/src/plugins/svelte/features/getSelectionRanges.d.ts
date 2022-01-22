import { Position, SelectionRange } from 'vscode-languageserver';
import { SvelteDocument } from '../SvelteDocument';
export declare function getSelectionRange(svelteDoc: SvelteDocument, position: Position): Promise<SelectionRange | null>;
