import { CancellationToken, CodeAction, CodeActionContext, CompletionContext, DefinitionLink, Diagnostic, Hover, Location, Position, Range, ReferenceContext, SelectionRange, SemanticTokens, SignatureHelp, SignatureHelpContext, SymbolInformation, TextDocumentContentChangeEvent, WorkspaceEdit } from 'vscode-languageserver';
import { Document } from '../../lib/documents';
import { LSConfigManager } from '../../ls-config';
import { AppCompletionItem, AppCompletionList, CodeActionsProvider, CompletionsProvider, DefinitionsProvider, DiagnosticsProvider, DocumentSymbolsProvider, FileRename, FindReferencesProvider, HoverProvider, OnWatchFileChanges, OnWatchFileChangesPara, RenameProvider, SelectionRangeProvider, SemanticTokensProvider, SignatureHelpProvider, UpdateImportsProvider, ImplementationProvider, UpdateTsOrJsFile } from '../interfaces';
import { CompletionEntryWithIdentifer } from './features/CompletionProvider';
import { LSAndTSDocResolver } from './LSAndTSDocResolver';
export declare class TypeScriptPlugin implements DiagnosticsProvider, HoverProvider, DocumentSymbolsProvider, DefinitionsProvider, CodeActionsProvider, UpdateImportsProvider, RenameProvider, FindReferencesProvider, SelectionRangeProvider, SignatureHelpProvider, SemanticTokensProvider, ImplementationProvider, OnWatchFileChanges, CompletionsProvider<CompletionEntryWithIdentifer>, UpdateTsOrJsFile {
    private readonly configManager;
    private readonly lsAndTsDocResolver;
    private readonly completionProvider;
    private readonly codeActionsProvider;
    private readonly updateImportsProvider;
    private readonly diagnosticsProvider;
    private readonly renameProvider;
    private readonly hoverProvider;
    private readonly findReferencesProvider;
    private readonly selectionRangeProvider;
    private readonly signatureHelpProvider;
    private readonly semanticTokensProvider;
    private readonly implementationProvider;
    constructor(configManager: LSConfigManager, lsAndTsDocResolver: LSAndTSDocResolver);
    getDiagnostics(document: Document, cancellationToken?: CancellationToken): Promise<Diagnostic[]>;
    doHover(document: Document, position: Position): Promise<Hover | null>;
    getDocumentSymbols(document: Document, cancellationToken?: CancellationToken): Promise<SymbolInformation[]>;
    getCompletions(document: Document, position: Position, completionContext?: CompletionContext, cancellationToken?: CancellationToken): Promise<AppCompletionList<CompletionEntryWithIdentifer> | null>;
    resolveCompletion(document: Document, completionItem: AppCompletionItem<CompletionEntryWithIdentifer>, cancellationToken?: CancellationToken): Promise<AppCompletionItem<CompletionEntryWithIdentifer>>;
    getDefinitions(document: Document, position: Position): Promise<DefinitionLink[]>;
    prepareRename(document: Document, position: Position): Promise<Range | null>;
    rename(document: Document, position: Position, newName: string): Promise<WorkspaceEdit | null>;
    getCodeActions(document: Document, range: Range, context: CodeActionContext, cancellationToken?: CancellationToken): Promise<CodeAction[]>;
    executeCommand(document: Document, command: string, args?: any[]): Promise<WorkspaceEdit | null>;
    updateImports(fileRename: FileRename): Promise<WorkspaceEdit | null>;
    findReferences(document: Document, position: Position, context: ReferenceContext): Promise<Location[] | null>;
    onWatchFileChanges(onWatchFileChangesParas: OnWatchFileChangesPara[]): Promise<void>;
    updateTsOrJsFile(fileName: string, changes: TextDocumentContentChangeEvent[]): Promise<void>;
    getSelectionRange(document: Document, position: Position): Promise<SelectionRange | null>;
    getSignatureHelp(document: Document, position: Position, context: SignatureHelpContext | undefined, cancellationToken?: CancellationToken): Promise<SignatureHelp | null>;
    getSemanticTokens(textDocument: Document, range?: Range, cancellationToken?: CancellationToken): Promise<SemanticTokens | null>;
    getImplementation(document: Document, position: Position): Promise<Location[] | null>;
    private getLSAndTSDoc;
    /**
     * @internal Public for tests only
     */
    getSnapshotManager(fileName: string): Promise<import("./SnapshotManager").SnapshotManager>;
    private featureEnabled;
}
