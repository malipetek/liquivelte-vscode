import { Hover, Position } from 'vscode-languageserver';
import { SvelteDocument } from '../SvelteDocument';
import { Document } from '../../../lib/documents';
/**
 * Get hover information for special svelte tags within moustache tags.
 */
export declare function getHoverInfo(document: Document, svelteDoc: SvelteDocument, position: Position): Hover | null;
