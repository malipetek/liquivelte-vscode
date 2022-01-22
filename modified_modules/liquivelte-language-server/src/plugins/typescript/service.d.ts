import ts from 'typescript';
import { TextDocumentContentChangeEvent } from 'vscode-languageserver-protocol';
import { Document } from '../../lib/documents';
import { DocumentSnapshot } from './DocumentSnapshot';
import { GlobalSnapshotsManager, SnapshotManager } from './SnapshotManager';
export interface LanguageServiceContainer {
    readonly tsconfigPath: string;
    readonly compilerOptions: ts.CompilerOptions;
    /**
     * @internal Public for tests only
     */
    readonly snapshotManager: SnapshotManager;
    getService(): ts.LanguageService;
    updateSnapshot(documentOrFilePath: Document | string): DocumentSnapshot;
    deleteSnapshot(filePath: string): void;
    updateProjectFiles(): void;
    updateTsOrJsFile(fileName: string, changes?: TextDocumentContentChangeEvent[]): void;
    /**
     * Checks if a file is present in the project.
     * Unlike `fileBelongsToProject`, this doesn't run a file search on disk.
     */
    hasFile(filePath: string): boolean;
    /**
     * Careful, don't call often, or it will hurt performance.
     * Only works for TS versions that have ScriptKind.Deferred
     */
    fileBelongsToProject(filePath: string): boolean;
}
export interface LanguageServiceDocumentContext {
    ambientTypesSource: string;
    transformOnTemplateError: boolean;
    createDocument: (fileName: string, content: string) => Document;
    globalSnapshotsManager: GlobalSnapshotsManager;
    notifyExceedSizeLimit: (() => void) | undefined;
}
export declare function getService(path: string, workspaceUris: string[], docContext: LanguageServiceDocumentContext): Promise<LanguageServiceContainer>;
export declare function forAllServices(cb: (service: LanguageServiceContainer) => any): Promise<void>;
/**
 * @param tsconfigPath has to be absolute
 * @param docContext
 */
export declare function getServiceForTsconfig(tsconfigPath: string, docContext: LanguageServiceDocumentContext): Promise<LanguageServiceContainer>;
