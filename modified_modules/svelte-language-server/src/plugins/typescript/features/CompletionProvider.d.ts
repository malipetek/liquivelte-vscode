import ts from 'typescript';
import { CancellationToken, CompletionContext, Position, TextDocumentIdentifier, TextEdit } from 'vscode-languageserver';
import { Document } from '../../../lib/documents';
import { LSConfigManager } from '../../../ls-config';
import { AppCompletionItem, AppCompletionList, CompletionsProvider } from '../../interfaces';
import { SvelteSnapshotFragment } from '../DocumentSnapshot';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export interface CompletionEntryWithIdentifer extends ts.CompletionEntry, TextDocumentIdentifier {
    position: Position;
}
export declare class CompletionsProviderImpl implements CompletionsProvider<CompletionEntryWithIdentifer> {
    private readonly lsAndTsDocResolver;
    private readonly configManager;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver, configManager: LSConfigManager);
    /**
     * The language service throws an error if the character is not a valid trigger character.
     * Also, the completions are worse.
     * Therefore, only use the characters the typescript compiler treats as valid.
     */
    private readonly validTriggerCharacters;
    /**
     * For performance reasons, try to reuse the last completion if possible.
     */
    private lastCompletion?;
    private isValidTriggerCharacter;
    getCompletions(document: Document, position: Position, completionContext?: CompletionContext, cancellationToken?: CancellationToken): Promise<AppCompletionList<CompletionEntryWithIdentifer> | null>;
    private canReuseLastCompletion;
    private getExistingImports;
    private getEventAndSlotLetCompletions;
    private toCompletionItem;
    private getCompletionLabelAndInsert;
    private isExistingSvelteComponentImport;
    /**
     * If the textEdit is out of the word range of the triggered position
     * vscode would refuse to show the completions
     * split those edits into additionalTextEdit to fix it
     */
    private fixTextEditRange;
    /**
     * TypeScript throws a debug assertion error if the importModuleSpecifierEnding config is
     * 'js' and there's an unknown file extension - which is the case for `.svelte`. Therefore
     * rewrite the importModuleSpecifierEnding for this case to silence the error.
     */
    fixUserPreferencesForSvelteComponentImport(userPreferences: ts.UserPreferences): ts.UserPreferences;
    resolveCompletion(document: Document, completionItem: AppCompletionItem<CompletionEntryWithIdentifer>, cancellationToken?: CancellationToken): Promise<AppCompletionItem<CompletionEntryWithIdentifer>>;
    private getCompletionDocument;
    private codeActionChangesToTextEdit;
    codeActionChangeToTextEdit(doc: Document, fragment: SvelteSnapshotFragment, change: ts.TextChange, isImport: boolean, originalTriggerPosition: Position): TextEdit;
    private mapRangeForNewImport;
    private offsetLinesAndMovetoStartOfLine;
    private isSvelteComponentImport;
    private changeComponentImport;
}
