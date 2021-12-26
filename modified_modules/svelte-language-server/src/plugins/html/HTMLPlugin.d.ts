import { CompletionList, Hover, Position, SymbolInformation, Range, WorkspaceEdit, LinkedEditingRanges } from 'vscode-languageserver';
import { DocumentManager, Document } from '../../lib/documents';
import { LSConfigManager } from '../../ls-config';
import { HoverProvider, CompletionsProvider, RenameProvider, LinkedEditingRangesProvider } from '../interfaces';
export declare class HTMLPlugin implements HoverProvider, CompletionsProvider, RenameProvider, LinkedEditingRangesProvider {
    private configManager;
    private lang;
    private documents;
    private styleScriptTemplate;
    constructor(docManager: DocumentManager, configManager: LSConfigManager);
    doHover(document: Document, position: Position): Hover | null;
    getCompletions(document: Document, position: Position): CompletionList | null;
    /**
     * The HTML language service uses newer types which clash
     * without the stable ones. Transform to the stable types.
     */
    private toCompletionItems;
    private isInComponentTag;
    private getLangCompletions;
    doTagComplete(document: Document, position: Position): string | null;
    private isInsideMoustacheTag;
    getDocumentSymbols(document: Document): SymbolInformation[];
    rename(document: Document, position: Position, newName: string): WorkspaceEdit | null;
    prepareRename(document: Document, position: Position): Range | null;
    getLinkedEditingRanges(document: Document, position: Position): LinkedEditingRanges | null;
    /**
     * Returns true if rename happens at the tag name, not anywhere inbetween.
     */
    private isRenameAtTag;
    private featureEnabled;
}
