import { CancellationToken, Diagnostic } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { DiagnosticsProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class DiagnosticsProviderImpl implements DiagnosticsProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    getDiagnostics(document: Document, cancellationToken?: CancellationToken): Promise<Diagnostic[]>;
    private getLSAndTSDoc;
}
