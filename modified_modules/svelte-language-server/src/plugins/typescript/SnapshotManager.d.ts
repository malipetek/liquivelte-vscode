import { DocumentSnapshot, JSOrTSDocumentSnapshot } from './DocumentSnapshot';
import { TextDocumentContentChangeEvent } from 'vscode-languageserver';
/**
 * Every snapshot corresponds to a unique file on disk.
 * A snapshot can be part of multiple projects, but for a given file path
 * there can be only one snapshot.
 */
export declare class GlobalSnapshotsManager {
    private emitter;
    private documents;
    get(fileName: string): DocumentSnapshot | undefined;
    set(fileName: string, document: DocumentSnapshot): void;
    delete(fileName: string): void;
    updateTsOrJsFile(fileName: string, changes?: TextDocumentContentChangeEvent[]): JSOrTSDocumentSnapshot | undefined;
    onChange(listener: (fileName: string, newDocument: DocumentSnapshot | undefined) => void): void;
}
export interface TsFilesSpec {
    include?: readonly string[];
    exclude?: readonly string[];
}
/**
 * Should only be used by `service.ts`
 */
export declare class SnapshotManager {
    private globalSnapshotsManager;
    private projectFiles;
    private fileSpec;
    private workspaceRoot;
    private documents;
    private lastLogged;
    private readonly watchExtensions;
    constructor(globalSnapshotsManager: GlobalSnapshotsManager, projectFiles: string[], fileSpec: TsFilesSpec, workspaceRoot: string);
    updateProjectFiles(): void;
    updateTsOrJsFile(fileName: string, changes?: TextDocumentContentChangeEvent[]): void;
    has(fileName: string): boolean;
    set(fileName: string, snapshot: DocumentSnapshot): void;
    get(fileName: string): DocumentSnapshot | undefined;
    delete(fileName: string): void;
    getFileNames(): string[];
    getProjectFileNames(): string[];
    private logStatistics;
}
export declare const ignoredBuildDirectories: string[];
