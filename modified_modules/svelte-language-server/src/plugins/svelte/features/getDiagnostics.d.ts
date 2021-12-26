import { Diagnostic } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { CompilerWarningsSettings } from '../../../ls-config';
import { SvelteDocument } from '../SvelteDocument';
/**
 * Returns diagnostics from the svelte compiler.
 * Also tries to return errors at correct position if transpilation/preprocessing fails.
 */
export declare function getDiagnostics(document: Document, svelteDoc: SvelteDocument, settings: CompilerWarningsSettings): Promise<Diagnostic[]>;
