import { Diagnostic } from 'vscode-languageserver';
export declare type SvelteCheckDiagnosticSource = 'js' | 'css' | 'liquivelte';
export interface SvelteCheckOptions {
    compilerWarnings?: Record<string, 'ignore' | 'error'>;
    diagnosticSources?: SvelteCheckDiagnosticSource[];
    /**
     * Path has to be absolute
     */
    tsconfig?: string;
}
/**
 * Small wrapper around PluginHost's Diagnostic Capabilities
 * for svelte-check, without the overhead of the lsp.
 */
export declare class SvelteCheck {
    private options;
    private docManager;
    private configManager;
    private pluginHost;
    private lsAndTSDocResolver?;
    constructor(workspacePath: string, options?: SvelteCheckOptions);
    private initialize;
    /**
     * Creates/updates given document
     *
     * @param doc Text and Uri of the document
     * @param isNew Whether or not this is the creation of the document
     */
    upsertDocument(doc: {
        text: string;
        uri: string;
    }, isNew: boolean): Promise<void>;
    /**
     * Removes/closes document
     *
     * @param uri Uri of the document
     */
    removeDocument(uri: string): Promise<void>;
    /**
     * Gets the diagnostics for all currently open files.
     */
    getDiagnostics(): Promise<Array<{
        filePath: string;
        text: string;
        diagnostics: Diagnostic[];
    }>>;
    private getDiagnosticsForTsconfig;
    private getDiagnosticsForFile;
    private getLSContainer;
}
