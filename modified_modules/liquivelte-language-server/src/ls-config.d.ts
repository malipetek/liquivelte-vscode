import { UserPreferences } from 'typescript';
import { VSCodeEmmetConfig } from 'vscode-emmet-helper';
/**
 * Representation of the language server config.
 * Should be kept in sync with infos in `packages/svelte-vscode/package.json`.
 */
export interface LSConfig {
    typescript: LSTypescriptConfig;
    css: LSCSSConfig;
    html: LSHTMLConfig;
    liquivelte: LSSvelteConfig;
}
export interface LSTypescriptConfig {
    enable: boolean;
    diagnostics: {
        enable: boolean;
    };
    hover: {
        enable: boolean;
    };
    documentSymbols: {
        enable: boolean;
    };
    completions: {
        enable: boolean;
    };
    findReferences: {
        enable: boolean;
    };
    definitions: {
        enable: boolean;
    };
    codeActions: {
        enable: boolean;
    };
    rename: {
        enable: boolean;
    };
    selectionRange: {
        enable: boolean;
    };
    signatureHelp: {
        enable: boolean;
    };
    semanticTokens: {
        enable: boolean;
    };
    implementation: {
        enable: boolean;
    };
}
export interface LSCSSConfig {
    enable: boolean;
    globals: string;
    diagnostics: {
        enable: boolean;
    };
    hover: {
        enable: boolean;
    };
    completions: {
        enable: boolean;
        emmet: boolean;
    };
    documentColors: {
        enable: boolean;
    };
    colorPresentations: {
        enable: boolean;
    };
    documentSymbols: {
        enable: boolean;
    };
    selectionRange: {
        enable: boolean;
    };
}
export interface LSHTMLConfig {
    enable: boolean;
    hover: {
        enable: boolean;
    };
    completions: {
        enable: boolean;
        emmet: boolean;
    };
    tagComplete: {
        enable: boolean;
    };
    documentSymbols: {
        enable: boolean;
    };
    renameTags: {
        enable: boolean;
    };
    linkedEditing: {
        enable: boolean;
    };
}
export declare type CompilerWarningsSettings = Record<string, 'ignore' | 'error'>;
export interface LSSvelteConfig {
    enable: boolean;
    compilerWarnings: CompilerWarningsSettings;
    diagnostics: {
        enable: boolean;
    };
    format: {
        enable: boolean;
        config: {
            svelteSortOrder: string;
            svelteStrictMode: boolean;
            svelteAllowShorthand: boolean;
            svelteBracketNewLine: boolean;
            svelteIndentScriptAndStyle: boolean;
            printWidth: number;
            singleQuote: boolean;
        };
    };
    rename: {
        enable: boolean;
    };
    completions: {
        enable: boolean;
    };
    hover: {
        enable: boolean;
    };
    codeActions: {
        enable: boolean;
    };
    selectionRange: {
        enable: boolean;
    };
    defaultScriptLanguage: 'none' | 'ts';
}
/**
 * A subset of the JS/TS VS Code settings which
 * are transformed to ts.UserPreferences.
 * It may not be available in other IDEs, that's why the keys are optional.
 */
export interface TSUserConfig {
    preferences?: TsUserPreferencesConfig;
    suggest?: TSSuggestConfig;
}
/**
 * A subset of the JS/TS VS Code settings which
 * are transformed to ts.UserPreferences.
 */
export interface TsUserPreferencesConfig {
    importModuleSpecifier: UserPreferences['importModuleSpecifierPreference'];
    importModuleSpecifierEnding: UserPreferences['importModuleSpecifierEnding'];
    quoteStyle: UserPreferences['quotePreference'];
    /**
     * only in typescript config
     */
    includePackageJsonAutoImports?: UserPreferences['includePackageJsonAutoImports'];
}
/**
 * A subset of the JS/TS VS Code settings which
 * are transformed to ts.UserPreferences.
 */
export interface TSSuggestConfig {
    autoImports: UserPreferences['includeCompletionsForModuleExports'];
    includeAutomaticOptionalChainCompletions: boolean | undefined;
    includeCompletionsForImportStatements: boolean | undefined;
}
export declare type TsUserConfigLang = 'typescript' | 'javascript';
/**
 * The config as the vscode-css-languageservice understands it
 */
export interface CssConfig {
    validate?: boolean;
    lint?: any;
    completion?: any;
    hover?: any;
}
declare type DeepPartial<T> = T extends CompilerWarningsSettings ? T : {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export declare class LSConfigManager {
    private config;
    private listeners;
    private tsUserPreferences;
    private prettierConfig;
    private emmetConfig;
    private cssConfig;
    private scssConfig;
    private lessConfig;
    private isTrusted;
    /**
     * Updates config.
     */
    update(config: DeepPartial<LSConfig>): void;
    /**
     * Whether or not specified config is enabled
     * @param key a string which is a path. Example: 'svelte.diagnostics.enable'.
     */
    enabled(key: string): boolean;
    /**
     * Get specific config
     * @param key a string which is a path. Example: 'svelte.diagnostics.enable'.
     */
    get<T>(key: string): T;
    /**
     * Get the whole config
     */
    getConfig(): Readonly<LSConfig>;
    /**
     * Register a listener which is invoked when the config changed.
     */
    onChange(callback: (config: LSConfigManager) => void): void;
    updateEmmetConfig(config: VSCodeEmmetConfig): void;
    getEmmetConfig(): VSCodeEmmetConfig;
    updatePrettierConfig(config: any): void;
    getPrettierConfig(): any;
    /**
     * Returns a merged Prettier config following these rules:
     * - If `prettierFromFileConfig` exists, that one is returned
     * - Else the Svelte extension's Prettier config is used as a starting point,
     *   and overridden by a possible Prettier config from the Prettier extension,
     *   or, if that doesn't exist, a possible fallback override.
     */
    getMergedPrettierConfig(prettierFromFileConfig: any, overridesWhenNoPrettierConfig?: any): any;
    updateTsJsUserPreferences(config: Record<TsUserConfigLang, TSUserConfig>): void;
    /**
     * Whether or not the current workspace can be trusted.
     * If not, certain operations should be disabled.
     */
    getIsTrusted(): boolean;
    updateIsTrusted(isTrusted: boolean): void;
    private _updateTsUserPreferences;
    getTsUserPreferences(lang: TsUserConfigLang): UserPreferences;
    updateCssConfig(config: CssConfig | undefined): void;
    getCssConfig(): CssConfig | undefined;
    updateScssConfig(config: CssConfig | undefined): void;
    getScssConfig(): CssConfig | undefined;
    updateLessConfig(config: CssConfig | undefined): void;
    getLessConfig(): CssConfig | undefined;
}
export declare const lsConfig: LSConfigManager;
export {};
