import { Position, WorkspaceEdit, Range } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { RenameProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class RenameProviderImpl implements RenameProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    prepareRename(document: Document, position: Position): Promise<Range | null>;
    rename(document: Document, position: Position, newName: string): Promise<WorkspaceEdit | null>;
    private getRenameInfo;
    /**
     * If user renames prop of component A inside component A,
     * we need to handle the rename of the prop of A ourselves.
     * Reason: the rename will do {oldPropName: newPropName}, meaning
     * the rename will not propagate further, so we have to handle
     * the conversion to {newPropName: newPropName} ourselves.
     */
    private getAdditionLocationsForRenameOfPropInsideComponentWithProp;
    /**
     * If user renames prop of component A inside component B,
     * we need to handle the rename of the prop of A ourselves.
     * Reason: the rename will rename the prop in the computed svelte2tsx code,
     * but not the `export let X` code in the original because the
     * rename does not propagate further than the prop.
     * This additional logic/propagation is done in this method.
     */
    private getAdditionalLocationsForRenameOfPropInsideOtherComponent;
    private matchGeneratedExportLet;
    private findLocationWhichWantsToUpdatePropName;
    private isInSvelte2TsxPropLine;
    /**
     * The rename locations the ts language services hands back are relative to the
     * svelte2tsx generated code -> map it back to the original document positions.
     * Some of those positions could be unmapped (line=-1), these are handled elsewhere.
     * Also filter out wrong renames.
     */
    private mapAndFilterRenameLocations;
    private filterWrongRenameLocations;
    private mapRangeToOriginal;
    private getVariableAtPosition;
    private getLSAndTSDoc;
    private getSnapshot;
    private checkShortHandBindingOrSlotLetLocation;
    private getShorthandPropInfo;
    private getSlotLetInfo;
}
