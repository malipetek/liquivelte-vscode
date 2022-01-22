import { Position, SelectionRange } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { SelectionRangeProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class SelectionRangeProviderImpl implements SelectionRangeProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    getSelectionRange(document: Document, position: Position): Promise<SelectionRange | null>;
    private toSelectionRange;
    private filterOutUnmappedRange;
    /**
     *   flatten the selection range and its parent to an array in reverse order
     * so it's easier to filter out unmapped selection and create a new tree of
     * selection range
     */
    private flattenAndReverseSelectionRange;
}
