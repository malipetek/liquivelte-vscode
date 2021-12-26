import { _Connection, TextDocumentIdentifier, Diagnostic } from 'vscode-languageserver';
import { DocumentManager, Document } from './documents';
export declare type SendDiagnostics = _Connection['sendDiagnostics'];
export declare type GetDiagnostics = (doc: TextDocumentIdentifier) => Thenable<Diagnostic[]>;
export declare class DiagnosticsManager {
    private sendDiagnostics;
    private docManager;
    private getDiagnostics;
    constructor(sendDiagnostics: SendDiagnostics, docManager: DocumentManager, getDiagnostics: GetDiagnostics);
    updateAll(): void;
    update(document: Document): Promise<void>;
    removeDiagnostics(document: Document): void;
}
