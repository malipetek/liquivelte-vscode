import { CodeAction, Diagnostic } from 'vscode-languageserver';
import { SvelteDocument } from '../../SvelteDocument';
/**
 * Get applicable quick fixes.
 */
export declare function getQuickfixActions(svelteDoc: SvelteDocument, svelteDiagnostics: Diagnostic[]): Promise<CodeAction[]>;
/**
 * Whether or not the given diagnostic can be ignored via a
 * <!-- svelte-ignore <code> -->
 */
export declare function isIgnorableSvelteDiagnostic(diagnostic: Diagnostic): boolean | "" | 0 | undefined;
