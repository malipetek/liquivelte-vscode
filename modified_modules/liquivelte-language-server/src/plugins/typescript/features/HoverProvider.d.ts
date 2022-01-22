import { Hover, Position } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { HoverProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class HoverProviderImpl implements HoverProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    doHover(document: Document, position: Position): Promise<Hover | null>;
    private getEventHoverInfo;
    private getLSAndTSDoc;
}
