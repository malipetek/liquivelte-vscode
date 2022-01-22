import ts from 'typescript';
import { TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { Document, DocumentManager } from '../../lib/documents';
import { LSConfigManager } from '../../ls-config';
import { DocumentSnapshot, SvelteDocumentSnapshot } from './DocumentSnapshot';
import { LanguageServiceContainer } from './service';
import { SnapshotManager } from './SnapshotManager';
export declare class LSAndTSDocResolver {
    private readonly docManager;
    private readonly workspaceUris;
    private readonly configManager;
    private readonly notifyExceedSizeLimit?;
    private readonly isSvelteCheck;
    private readonly tsconfigPath?;
    /**
     *
     * @param docManager
     * @param workspaceUris
     * @param configManager
     * @param notifyExceedSizeLimit
     * @param isSvelteCheck True, if used in the context of svelte-check
     * @param tsconfigPath This should only be set via svelte-check. Makes sure all documents are resolved to that tsconfig. Has to be absolute.
     */
    constructor(docManager: DocumentManager, workspaceUris: string[], configManager: LSConfigManager, notifyExceedSizeLimit?: (() => void) | undefined, isSvelteCheck?: boolean, tsconfigPath?: string | undefined);
    /**
     * Create a svelte document -> should only be invoked with svelte files.
     */
    private createDocument;
    private globalSnapshotsManager;
    private get lsDocumentContext();
    getLSForPath(path: string): Promise<any>;
    getLSAndTSDoc(document: Document): Promise<{
        tsDoc: SvelteDocumentSnapshot;
        lang: ts.LanguageService;
        userPreferences: ts.UserPreferences;
    }>;
    /**
     * Retrieves and updates the snapshot for the given document or path from
     * the ts service it primarely belongs into.
     * The update is mirrored in all other services, too.
     */
    getSnapshot(document: Document): Promise<SvelteDocumentSnapshot>;
    getSnapshot(pathOrDoc: string | Document): Promise<DocumentSnapshot>;
    /**
     * Updates snapshot path in all existing ts services and retrieves snapshot
     */
    updateSnapshotPath(oldPath: string, newPath: string): Promise<DocumentSnapshot>;
    /**
     * Deletes snapshot in all existing ts services
     */
    deleteSnapshot(filePath: string): Promise<void>;
    /**
     * Updates project files in all existing ts services
     */
    updateProjectFiles(): Promise<void>;
    /**
     * Updates file in all ts services where it exists
     */
    updateExistingTsOrJsFile(path: string, changes?: TextDocumentContentChangeEvent[]): Promise<void>;
    /**
     * @internal Public for tests only
     */
    getSnapshotManager(filePath: string): Promise<SnapshotManager>;
    getTSService(filePath?: string): Promise<LanguageServiceContainer>;
    private getUserPreferences;
}
