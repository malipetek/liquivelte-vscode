import { TextDocumentContentChangeEvent, TextDocumentItem, VersionedTextDocumentIdentifier } from 'vscode-languageserver';
import { Document } from './Document';
export declare type DocumentEvent = 'documentOpen' | 'documentChange' | 'documentClose';
/**
 * Manages svelte documents
 */
export declare class DocumentManager {
    private createDocument;
    private emitter;
    private openedInClient;
    private documents;
    private locked;
    private deleteCandidates;
    constructor(createDocument: (textDocument: Pick<TextDocumentItem, 'text' | 'uri'>) => Document);
    openDocument(textDocument: Pick<TextDocumentItem, 'text' | 'uri'>): Document;
    lockDocument(uri: string): void;
    markAsOpenedInClient(uri: string): void;
    getAllOpenedByClient(): [string, Document][];
    releaseDocument(uri: string): void;
    closeDocument(uri: string): void;
    updateDocument(textDocument: VersionedTextDocumentIdentifier, changes: TextDocumentContentChangeEvent[]): void;
    on(name: DocumentEvent, listener: (document: Document) => void): void;
    get(uri: string): Document | undefined;
    private notify;
}
