// @ts-nocheck
import { _Connection, TextDocumentIdentifier, Diagnostic } from 'vscode-languageserver';
import { DocumentManager, Document } from './documents';

export type SendDiagnostics = _Connection['sendDiagnostics'];
export type GetDiagnostics = (doc: TextDocumentIdentifier) => Thenable<Diagnostic[]>;

export class DiagnosticsManager {
    constructor(
        private sendDiagnostics: SendDiagnostics,
        private docManager: DocumentManager,
        private getDiagnostics: GetDiagnostics
    ) {}

    updateAll() {
        this.docManager.getAllOpenedByClient().forEach((doc) => {
            this.update(doc[1]);
        });
    }

    async update (document: Document)
    {
        const documentUri = document.getURL();
        const liquivelteUri = documentUri.replace('file:', 'liquivelte:');
        let diagnostics = await this.getDiagnostics({ uri: documentUri });
        let replaceOperations = [];
        if (this.docManager.documents.has(liquivelteUri)) { 
            let liquivelteDoc = this.docManager.get(liquivelteUri);
            replaceOperations = liquivelteDoc?.replaceOperations || [];
        }
        if (replaceOperations) {
            diagnostics = diagnostics.map(dia =>
            {
                // @ts-ignore
                const lineAdditionsBefore = replaceOperations.filter(op => op.was.lines[0] < dia.range.start.line && op.linesAdded).reduce((acc, op) => acc + op.linesAdded, 0);
                dia.range.start.line -= lineAdditionsBefore;
                dia.range.end.line -= lineAdditionsBefore;
                return dia;
            });
        }
        this.sendDiagnostics({
            uri: documentUri,
            diagnostics
        });
    }

    removeDiagnostics(document: Document) {
        this.sendDiagnostics({
            uri: document.getURL(),
            diagnostics: []
        });
    }
}
