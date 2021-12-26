import { CancellationToken, Range, SemanticTokens } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { SemanticTokensProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class SemanticTokensProviderImpl implements SemanticTokensProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    getSemanticTokens(textDocument: Document, range?: Range, cancellationToken?: CancellationToken): Promise<SemanticTokens | null>;
    private mapToOrigin;
    /**
     *  TSClassification = (TokenType + 1) << TokenEncodingConsts.typeOffset + TokenModifier
     */
    private getTokenTypeFromClassification;
    private getTokenModifierFromClassification;
}
