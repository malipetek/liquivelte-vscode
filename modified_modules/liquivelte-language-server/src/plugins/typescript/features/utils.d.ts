import ts from 'typescript';
import { Position } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { ComponentInfoProvider } from '../ComponentInfoProvider';
import { DocumentSnapshot, SnapshotFragment, SvelteDocumentSnapshot } from '../DocumentSnapshot';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
declare type NodeTypePredicate<T extends ts.Node> = (node: ts.Node) => node is T;
/**
 * If the given original position is within a Svelte starting tag,
 * return the snapshot of that component.
 */
export declare function getComponentAtPosition(lang: ts.LanguageService, doc: Document, tsDoc: SvelteDocumentSnapshot, originalPosition: Position): Promise<ComponentInfoProvider | null>;
export declare function isComponentAtPosition(doc: Document, tsDoc: SvelteDocumentSnapshot, originalPosition: Position): boolean;
/**
 * Checks if this a section that should be completely ignored
 * because it's purely generated.
 */
export declare function isInGeneratedCode(text: string, start: number, end: number): boolean;
/**
 * Checks that this isn't a text span that should be completely ignored
 * because it's purely generated.
 */
export declare function isNoTextSpanInGeneratedCode(text: string, span: ts.TextSpan): boolean;
export declare function isPartOfImportStatement(text: string, position: Position): boolean;
export declare class SnapshotFragmentMap {
    private resolver;
    private map;
    constructor(resolver: LSAndTSDocResolver);
    set(fileName: string, content: {
        fragment: SnapshotFragment;
        snapshot: DocumentSnapshot;
    }): void;
    get(fileName: string): {
        fragment: SnapshotFragment;
        snapshot: DocumentSnapshot;
    } | undefined;
    getFragment(fileName: string): SnapshotFragment | undefined;
    retrieve(fileName: string): Promise<{
        fragment: SnapshotFragment;
        snapshot: DocumentSnapshot;
    }>;
    retrieveFragment(fileName: string): Promise<SnapshotFragment>;
}
export declare function isAfterSvelte2TsxPropsReturn(text: string, end: number): true | undefined;
export declare function findContainingNode<T extends ts.Node>(node: ts.Node, textSpan: ts.TextSpan, predicate: (node: ts.Node) => node is T): T | undefined;
/**
 * Finds node exactly matching span {start, length}.
 */
export declare function findNodeAtSpan<T extends ts.Node>(node: ts.Node, span: {
    start: number;
    length: number;
}, predicate?: NodeTypePredicate<T>): T | void;
export declare const isReactiveStatement: (node: any) => node is any;
export declare const isInReactiveStatement: (node: any) => boolean;
export declare const gatherIdentifiers: (node: any) => any[];
export {};
