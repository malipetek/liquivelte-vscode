import { RawSourceMap } from 'source-map';
import { IExportedNames } from 'svelte2tsx';
import ts from 'typescript';
import { Position, Range, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { Document, DocumentMapper, IdentityMapper, TagInformation } from '../../lib/documents';
/**
 * An error which occured while trying to parse/preprocess the svelte file contents.
 */
export interface ParserError {
    message: string;
    range: Range;
    code: number;
}
/**
 * Initial version of snapshots.
 */
export declare const INITIAL_VERSION = 0;
/**
 * A document snapshot suitable for the ts language service and the plugin.
 * Can be a svelte or ts/js file.
 */
export interface DocumentSnapshot extends ts.IScriptSnapshot {
    version: number;
    filePath: string;
    scriptKind: ts.ScriptKind;
    positionAt(offset: number): Position;
    /**
     * Instantiates a source mapper.
     * `destroyFragment` needs to be called when
     * it's no longer needed / the class should be cleaned up
     * in order to prevent memory leaks.
     */
    getFragment(): Promise<SnapshotFragment>;
    /**
     * Needs to be called when source mapper
     * is no longer needed / the class should be cleaned up
     * in order to prevent memory leaks.
     */
    destroyFragment(): void;
    /**
     * Convenience function for getText(0, getLength())
     */
    getFullText(): string;
}
/**
 * The mapper to get from original snapshot positions to generated and vice versa.
 */
export interface SnapshotFragment extends DocumentMapper {
    scriptInfo: TagInformation | null;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
}
/**
 * Options that apply to svelte files.
 */
export interface SvelteSnapshotOptions {
    transformOnTemplateError: boolean;
}
export declare namespace DocumentSnapshot {
    /**
     * Returns a svelte snapshot from a svelte document.
     * @param document the svelte document
     * @param options options that apply to the svelte document
     */
    function fromDocument(document: Document, options: SvelteSnapshotOptions): SvelteDocumentSnapshot;
    /**
     * Returns a svelte or ts/js snapshot from a file path, depending on the file contents.
     * @param filePath path to the js/ts/svelte file
     * @param createDocument function that is used to create a document in case it's a Svelte file
     * @param options options that apply in case it's a svelte file
     */
    function fromFilePath(filePath: string, createDocument: (filePath: string, text: string) => Document, options: SvelteSnapshotOptions): SvelteDocumentSnapshot | JSOrTSDocumentSnapshot;
    /**
     * Returns a ts/js snapshot from a file path.
     * @param filePath path to the js/ts file
     * @param options options that apply in case it's a svelte file
     */
    function fromNonSvelteFilePath(filePath: string): JSOrTSDocumentSnapshot;
    /**
     * Returns a svelte snapshot from a file path.
     * @param filePath path to the svelte file
     * @param createDocument function that is used to create a document
     * @param options options that apply in case it's a svelte file
     */
    function fromSvelteFilePath(filePath: string, createDocument: (filePath: string, text: string) => Document, options: SvelteSnapshotOptions): SvelteDocumentSnapshot;
}
/**
 * A svelte document snapshot suitable for the ts language service and the plugin.
 */
export declare class SvelteDocumentSnapshot implements DocumentSnapshot {
    private readonly parent;
    readonly parserError: ParserError | null;
    readonly scriptKind: ts.ScriptKind;
    private readonly text;
    private readonly nrPrependedLines;
    private readonly exportedNames;
    private readonly tsxMap?;
    private fragment?;
    version: number;
    constructor(parent: Document, parserError: ParserError | null, scriptKind: ts.ScriptKind, text: string, nrPrependedLines: number, exportedNames: IExportedNames, tsxMap?: RawSourceMap | undefined);
    get filePath(): string;
    getText(start: number, end: number): string;
    getLength(): number;
    getFullText(): string;
    getChangeRange(): undefined;
    positionAt(offset: number): Position;
    getLineContainingOffset(offset: number): string;
    hasProp(name: string): boolean;
    getFragment(): Promise<SvelteSnapshotFragment>;
    destroyFragment(): void;
    private getMapper;
}
/**
 * A js/ts document snapshot suitable for the ts language service and the plugin.
 * Since no mapping has to be done here, it also implements the mapper interface.
 */
export declare class JSOrTSDocumentSnapshot extends IdentityMapper implements DocumentSnapshot, SnapshotFragment {
    version: number;
    readonly filePath: string;
    private text;
    scriptKind: any;
    scriptInfo: null;
    constructor(version: number, filePath: string, text: string);
    getText(start: number, end: number): string;
    getLength(): number;
    getFullText(): string;
    getChangeRange(): undefined;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
    getFragment(): Promise<this>;
    destroyFragment(): void;
    update(changes: TextDocumentContentChangeEvent[]): void;
}
/**
 * The mapper to get from original svelte document positions
 * to generated snapshot positions and vice versa.
 */
export declare class SvelteSnapshotFragment implements SnapshotFragment {
    private readonly mapper;
    readonly text: string;
    private readonly parent;
    private readonly url;
    constructor(mapper: DocumentMapper, text: string, parent: Document, url: string);
    get scriptInfo(): TagInformation | null;
    get moduleScriptInfo(): TagInformation | null;
    get originalText(): string;
    getOriginalPosition(pos: Position): Position;
    getGeneratedPosition(pos: Position): Position;
    isInGenerated(pos: Position): boolean;
    getURL(): string;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
    /**
     * Needs to be called when source mapper is no longer needed in order to prevent memory leaks.
     */
    destroy(): void;
}
