import { Position, Location } from 'vscode-languageserver-protocol';
import { Document } from '../../../lib/documents';
import { ImplementationProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class ImplementationProviderImpl implements ImplementationProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    getImplementation(document: Document, position: Position): Promise<Location[] | null>;
}
