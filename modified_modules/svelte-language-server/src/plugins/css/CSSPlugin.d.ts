import { Color, ColorInformation, ColorPresentation, CompletionContext, CompletionList, Diagnostic, Hover, Position, Range, SymbolInformation, SelectionRange } from 'vscode-languageserver';
import { Document, DocumentManager } from '../../lib/documents';
import { LSConfigManager } from '../../ls-config';
import { ColorPresentationsProvider, CompletionsProvider, DiagnosticsProvider, DocumentColorsProvider, DocumentSymbolsProvider, HoverProvider, SelectionRangeProvider } from '../interfaces';
export declare class CSSPlugin implements HoverProvider, CompletionsProvider, DiagnosticsProvider, DocumentColorsProvider, ColorPresentationsProvider, DocumentSymbolsProvider, SelectionRangeProvider {
    private configManager;
    private cssDocuments;
    private triggerCharacters;
    private globalVars;
    constructor(docManager: DocumentManager, configManager: LSConfigManager);
    getSelectionRange(document: Document, position: Position): SelectionRange | null;
    getDiagnostics(document: Document): Diagnostic[];
    doHover(document: Document, position: Position): Hover | null;
    private doHoverInternal;
    getCompletions(document: Document, position: Position, completionContext?: CompletionContext): CompletionList | null;
    private inStyleAttributeWithoutInterpolation;
    private getCompletionsInternal;
    private appendGlobalVars;
    getDocumentColors(document: Document): ColorInformation[];
    getColorPresentations(document: Document, range: Range, color: Color): ColorPresentation[];
    getDocumentSymbols(document: Document): SymbolInformation[];
    private getCSSDoc;
    private updateConfigs;
    private featureEnabled;
}
