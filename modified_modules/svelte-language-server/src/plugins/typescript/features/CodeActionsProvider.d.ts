import { CancellationToken, CodeAction, CodeActionContext, Range, WorkspaceEdit } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { LSConfigManager } from '../../../ls-config';
import { CodeActionsProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
import { CompletionsProviderImpl } from './CompletionProvider';
export declare class CodeActionsProviderImpl implements CodeActionsProvider {
    private readonly lsAndTsDocResolver;
    private readonly completionProvider;
    private readonly configManager;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver, completionProvider: CompletionsProviderImpl, configManager: LSConfigManager);
    getCodeActions(document: Document, range: Range, context: CodeActionContext, cancellationToken?: CancellationToken): Promise<CodeAction[]>;
    private organizeImports;
    private fixIndentationOfImports;
    private checkRemoveImportCodeActionRange;
    private applyQuickfix;
    /**
     * import quick fix requires the symbol name to be the same as where it's defined.
     * But we have suffix on component default export to prevent conflict with
     * a local variable. So we use auto-import completion as a workaround here.
     */
    private getComponentImportQuickFix;
    private getApplicableRefactors;
    private applicableRefactorsToCodeActions;
    executeCommand(document: Document, command: string, args?: any[]): Promise<WorkspaceEdit | null>;
    /**
     * Some refactorings place the new code at the end of svelte2tsx' render function,
     *  which is unmapped. In this case, add it to the end of the script tag ourselves.
     */
    private checkEndOfFileCodeInsert;
    private checkTsNoCheckCodeInsert;
    private checkDisableJsDiagnosticsCodeInsert;
    private getLSAndTSDoc;
}
