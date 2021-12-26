import { Location, Position, ReferenceContext } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { FindReferencesProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class FindReferencesProviderImpl implements FindReferencesProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    findReferences(document: Document, position: Position, context: ReferenceContext): Promise<Location[] | null>;
    private getLSAndTSDoc;
}
