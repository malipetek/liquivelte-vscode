import { CancellationToken, CodeAction, CodeActionContext, Color, ColorInformation, ColorPresentation, CompletionContext, CompletionItem, CompletionList, DefinitionLink, Diagnostic, FormattingOptions, Hover, LinkedEditingRanges, Location, Position, Range, ReferenceContext, SelectionRange, SemanticTokens, SignatureHelp, SignatureHelpContext, SymbolInformation, TextDocumentContentChangeEvent, TextDocumentIdentifier, TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import { DocumentManager } from '../lib/documents';
import { AppCompletionItem, FileRename, LSPProviderConfig, LSProvider, OnWatchFileChanges, OnWatchFileChangesPara, Plugin } from './interfaces';
export declare class PluginHost implements LSProvider, OnWatchFileChanges {
    private documentsManager;
    private plugins;
    private pluginHostConfig;
    private deferredRequests;
    constructor(documentsManager: DocumentManager);
    initialize(pluginHostConfig: LSPProviderConfig): void;
    register(plugin: Plugin): void;
    didUpdateDocument(): void;
    getDiagnostics(textDocument: TextDocumentIdentifier): Promise<Diagnostic[]>;
    doHover(textDocument: TextDocumentIdentifier, position: Position): Promise<Hover | null>;
    getCompletions(textDocument: TextDocumentIdentifier, position: Position, completionContext?: CompletionContext, cancellationToken?: CancellationToken): Promise<CompletionList>;
    resolveCompletion(textDocument: TextDocumentIdentifier, completionItem: AppCompletionItem, cancellationToken: CancellationToken): Promise<CompletionItem>;
    formatDocument(textDocument: TextDocumentIdentifier, options: FormattingOptions): Promise<TextEdit[]>;
    doTagComplete(textDocument: TextDocumentIdentifier, position: Position): Promise<string | null>;
    getDocumentColors(textDocument: TextDocumentIdentifier): Promise<ColorInformation[]>;
    getColorPresentations(textDocument: TextDocumentIdentifier, range: Range, color: Color): Promise<ColorPresentation[]>;
    getDocumentSymbols(textDocument: TextDocumentIdentifier, cancellationToken: CancellationToken): Promise<SymbolInformation[]>;
    getDefinitions(textDocument: TextDocumentIdentifier, position: Position): Promise<DefinitionLink[] | Location[]>;
    getCodeActions(textDocument: TextDocumentIdentifier, range: Range, context: CodeActionContext, cancellationToken: CancellationToken): Promise<CodeAction[]>;
    executeCommand(textDocument: TextDocumentIdentifier, command: string, args?: any[]): Promise<WorkspaceEdit | string | null>;
    updateImports(fileRename: FileRename): Promise<WorkspaceEdit | null>;
    prepareRename(textDocument: TextDocumentIdentifier, position: Position): Promise<Range | null>;
    rename(textDocument: TextDocumentIdentifier, position: Position, newName: string): Promise<WorkspaceEdit | null>;
    findReferences(textDocument: TextDocumentIdentifier, position: Position, context: ReferenceContext): Promise<Location[] | null>;
    getSignatureHelp(textDocument: TextDocumentIdentifier, position: Position, context: SignatureHelpContext | undefined, cancellationToken: CancellationToken): Promise<SignatureHelp | null>;
    /**
     * The selection range supports multiple cursors,
     * each position should return its own selection range tree like `Array.map`.
     * Quote the LSP spec
     * > A selection range in the return array is for the position in the provided parameters at the same index. Therefore positions[i] must be contained in result[i].range.
     * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_selectionRange
     *
     * Making PluginHost implement the same interface would make it quite hard to get
     * the corresponding selection range of each position from different plugins.
     * Therefore the special treatment here.
     */
    getSelectionRanges(textDocument: TextDocumentIdentifier, positions: Position[]): Promise<SelectionRange[] | null>;
    getSemanticTokens(textDocument: TextDocumentIdentifier, range?: Range, cancellationToken?: CancellationToken): Promise<SemanticTokens | null>;
    getLinkedEditingRanges(textDocument: TextDocumentIdentifier, position: Position): Promise<LinkedEditingRanges | null>;
    getImplementation(textDocument: TextDocumentIdentifier, position: Position): Promise<Location[] | null>;
    onWatchFileChanges(onWatchFileChangesParas: OnWatchFileChangesPara[]): void;
    updateTsOrJsFile(fileName: string, changes: TextDocumentContentChangeEvent[]): void;
    private getDocument;
    private execute;
    private tryExecutePlugin;
}
