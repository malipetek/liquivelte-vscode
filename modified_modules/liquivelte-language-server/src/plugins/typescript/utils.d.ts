import ts from 'typescript';
import { CompletionItemKind, DiagnosticSeverity, DiagnosticTag, Position, Range, SymbolKind } from 'vscode-languageserver';
import { Document } from '../../lib/documents';
import { SnapshotFragment, SvelteSnapshotFragment } from './DocumentSnapshot';
export declare function getScriptKindFromFileName(fileName: string): ts.ScriptKind;
export declare function getExtensionFromScriptKind(kind: ts.ScriptKind | undefined): ts.Extension;
export declare function getScriptKindFromAttributes(attrs: Record<string, string>): ts.ScriptKind.TSX | ts.ScriptKind.JSX;
export declare function isSvelteFilePath(filePath: string): boolean;
export declare function isVirtualSvelteFilePath(filePath: string): boolean;
export declare function toRealSvelteFilePath(filePath: string): string;
export declare function ensureRealSvelteFilePath(filePath: string): string;
export declare function convertRange(document: {
    positionAt: (offset: number) => Position;
}, range: {
    start?: number;
    length?: number;
}): Range;
export declare function convertToLocationRange(defDoc: SnapshotFragment, textSpan: ts.TextSpan): Range;
export declare function hasNonZeroRange({ range }: {
    range?: Range;
}): boolean | undefined;
export declare function findTsConfigPath(fileName: string, rootUris: string[]): any;
export declare function isSubPath(uri: string, possibleSubPath: string): boolean;
export declare function symbolKindFromString(kind: string): SymbolKind;
export declare function scriptElementKindToCompletionItemKind(kind: ts.ScriptElementKind): CompletionItemKind;
export declare function getCommitCharactersForScriptElement(kind: ts.ScriptElementKind): string[] | undefined;
export declare function mapSeverity(category: ts.DiagnosticCategory): DiagnosticSeverity;
/**
 * Returns `// @ts-check` or `// @ts-nocheck` if content starts with comments and has one of these
 * in its comments.
 */
export declare function getTsCheckComment(str?: string): string | undefined;
export declare function convertToTextSpan(range: Range, fragment: SnapshotFragment): ts.TextSpan;
export declare function isInScript(position: Position, fragment: SvelteSnapshotFragment | Document): boolean;
export declare function getDiagnosticTag(diagnostic: ts.Diagnostic): DiagnosticTag[];
export declare function changeSvelteComponentName(name: string): string;
export declare function hasTsExtensions(fileName: string): boolean;
