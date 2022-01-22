import { CancellationToken, CodeAction, CodeActionContext, CompletionContext, CompletionList, Diagnostic, FormattingOptions, Hover, Position, Range, SelectionRange, TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import { Document } from '../../lib/documents';
import { LSConfigManager } from '../../ls-config';
import { CodeActionsProvider, CompletionsProvider, DiagnosticsProvider, FormattingProvider, HoverProvider, SelectionRangeProvider } from '../interfaces';
import { SvelteCompileResult } from './SvelteDocument';
export declare class SveltePlugin implements DiagnosticsProvider, FormattingProvider, CompletionsProvider, HoverProvider, CodeActionsProvider, SelectionRangeProvider {
    private configManager;
    private docManager;
    constructor(configManager: LSConfigManager);
    getDiagnostics(document: Document): Promise<Diagnostic[]>;
    getCompiledResult(document: Document): Promise<SvelteCompileResult | null>;
    formatDocument(document: Document, options: FormattingOptions): Promise<TextEdit[]>;
    getCompletions(document: Document, position: Position, _?: CompletionContext, cancellationToken?: CancellationToken): Promise<CompletionList | null>;
    doHover(document: Document, position: Position): Promise<Hover | null>;
    getCodeActions(document: Document, range: Range, context: CodeActionContext, cancellationToken?: CancellationToken): Promise<CodeAction[]>;
    executeCommand(document: Document, command: string, args?: any[]): Promise<WorkspaceEdit | string | null>;
    getSelectionRange(document: Document, position: Position): Promise<SelectionRange | null>;
    private featureEnabled;
    private getSvelteDoc;
}
