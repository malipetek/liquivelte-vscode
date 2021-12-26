"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lsConfig = exports.LSConfigManager = void 0;
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
/**
 * Default config for the language server.
 */
const defaultLSConfig = {
    typescript: {
        enable: true,
        diagnostics: { enable: true },
        hover: { enable: true },
        completions: { enable: true },
        definitions: { enable: true },
        findReferences: { enable: true },
        documentSymbols: { enable: true },
        codeActions: { enable: true },
        rename: { enable: true },
        selectionRange: { enable: true },
        signatureHelp: { enable: true },
        semanticTokens: { enable: true },
        implementation: { enable: true }
    },
    css: {
        enable: true,
        globals: '',
        diagnostics: { enable: true },
        hover: { enable: true },
        completions: { enable: true, emmet: true },
        documentColors: { enable: true },
        colorPresentations: { enable: true },
        documentSymbols: { enable: true },
        selectionRange: { enable: true }
    },
    html: {
        enable: true,
        hover: { enable: true },
        completions: { enable: true, emmet: true },
        tagComplete: { enable: true },
        documentSymbols: { enable: true },
        renameTags: { enable: true },
        linkedEditing: { enable: true }
    },
    liquivelte: {
        enable: true,
        compilerWarnings: {},
        diagnostics: { enable: true },
        rename: { enable: true },
        format: {
            enable: true,
            config: {
                svelteSortOrder: 'options-scripts-markup-styles',
                svelteStrictMode: false,
                svelteAllowShorthand: true,
                svelteBracketNewLine: true,
                svelteIndentScriptAndStyle: true,
                printWidth: 80,
                singleQuote: false
            }
        },
        completions: { enable: true },
        hover: { enable: true },
        codeActions: { enable: true },
        selectionRange: { enable: true },
        defaultScriptLanguage: 'none'
    }
};
class LSConfigManager {
    constructor() {
        this.config = defaultLSConfig;
        this.listeners = [];
        this.tsUserPreferences = {
            typescript: {
                includeCompletionsForModuleExports: true,
                includeCompletionsForImportStatements: true,
                includeCompletionsWithInsertText: true,
                includeAutomaticOptionalChainCompletions: true
            },
            javascript: {
                includeCompletionsForModuleExports: true,
                includeCompletionsForImportStatements: true,
                includeCompletionsWithInsertText: true,
                includeAutomaticOptionalChainCompletions: true
            }
        };
        this.prettierConfig = {};
        this.emmetConfig = {};
        this.isTrusted = true;
    }
    /**
     * Updates config.
     */
    update(config) {
        var _a;
        // Ideally we shouldn't need the merge here because all updates should be valid and complete configs.
        // But since those configs come from the client they might be out of synch with the valid config:
        // We might at some point in the future forget to synch config settings in all packages after updating the config.
        this.config = lodash_1.merge({}, defaultLSConfig, this.config, config);
        // Merge will keep arrays/objects if the new one is empty/has less entries,
        // therefore we need some extra checks if there are new settings
        if ((_a = config.liquivelte) === null || _a === void 0 ? void 0 : _a.compilerWarnings) {
            this.config.liquivelte.compilerWarnings = config.liquivelte.compilerWarnings;
        }
        this.listeners.forEach((listener) => listener(this));
    }
    /**
     * Whether or not specified config is enabled
     * @param key a string which is a path. Example: 'svelte.diagnostics.enable'.
     */
    enabled(key) {
        return !!this.get(key);
    }
    /**
     * Get specific config
     * @param key a string which is a path. Example: 'svelte.diagnostics.enable'.
     */
    get(key) {
        return lodash_1.get(this.config, key);
    }
    /**
     * Get the whole config
     */
    getConfig() {
        return this.config;
    }
    /**
     * Register a listener which is invoked when the config changed.
     */
    onChange(callback) {
        this.listeners.push(callback);
    }
    updateEmmetConfig(config) {
        this.emmetConfig = config || {};
        this.listeners.forEach((listener) => listener(this));
    }
    getEmmetConfig() {
        return this.emmetConfig;
    }
    updatePrettierConfig(config) {
        this.prettierConfig = config || {};
        this.listeners.forEach((listener) => listener(this));
    }
    getPrettierConfig() {
        return this.prettierConfig;
    }
    /**
     * Returns a merged Prettier config following these rules:
     * - If `prettierFromFileConfig` exists, that one is returned
     * - Else the Svelte extension's Prettier config is used as a starting point,
     *   and overridden by a possible Prettier config from the Prettier extension,
     *   or, if that doesn't exist, a possible fallback override.
     */
    getMergedPrettierConfig(prettierFromFileConfig, overridesWhenNoPrettierConfig = {}) {
        return (utils_1.returnObjectIfHasKeys(prettierFromFileConfig) ||
            lodash_1.merge({}, // merge into empty obj to not manipulate own config
            this.get('svelte.format.config'), utils_1.returnObjectIfHasKeys(this.getPrettierConfig()) ||
                overridesWhenNoPrettierConfig ||
                {}));
    }
    updateTsJsUserPreferences(config) {
        ['typescript', 'javascript'].forEach((lang) => {
            if (config[lang]) {
                this._updateTsUserPreferences(lang, config[lang]);
            }
        });
        this.listeners.forEach((listener) => listener(this));
    }
    /**
     * Whether or not the current workspace can be trusted.
     * If not, certain operations should be disabled.
     */
    getIsTrusted() {
        return this.isTrusted;
    }
    updateIsTrusted(isTrusted) {
        this.isTrusted = isTrusted;
        this.listeners.forEach((listener) => listener(this));
    }
    _updateTsUserPreferences(lang, config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.tsUserPreferences[lang] = Object.assign(Object.assign({}, this.tsUserPreferences[lang]), { importModuleSpecifierPreference: (_a = config.preferences) === null || _a === void 0 ? void 0 : _a.importModuleSpecifier, importModuleSpecifierEnding: (_b = config.preferences) === null || _b === void 0 ? void 0 : _b.importModuleSpecifierEnding, includePackageJsonAutoImports: (_c = config.preferences) === null || _c === void 0 ? void 0 : _c.includePackageJsonAutoImports, quotePreference: (_d = config.preferences) === null || _d === void 0 ? void 0 : _d.quoteStyle, includeCompletionsForModuleExports: (_f = (_e = config.suggest) === null || _e === void 0 ? void 0 : _e.autoImports) !== null && _f !== void 0 ? _f : true, includeCompletionsForImportStatements: (_h = (_g = config.suggest) === null || _g === void 0 ? void 0 : _g.includeCompletionsForImportStatements) !== null && _h !== void 0 ? _h : true, includeAutomaticOptionalChainCompletions: (_k = (_j = config.suggest) === null || _j === void 0 ? void 0 : _j.includeAutomaticOptionalChainCompletions) !== null && _k !== void 0 ? _k : true, includeCompletionsWithInsertText: true });
    }
    getTsUserPreferences(lang) {
        return this.tsUserPreferences[lang];
    }
    updateCssConfig(config) {
        this.cssConfig = config;
        this.listeners.forEach((listener) => listener(this));
    }
    getCssConfig() {
        return this.cssConfig;
    }
    updateScssConfig(config) {
        this.scssConfig = config;
        this.listeners.forEach((listener) => listener(this));
    }
    getScssConfig() {
        return this.scssConfig;
    }
    updateLessConfig(config) {
        this.lessConfig = config;
        this.listeners.forEach((listener) => listener(this));
    }
    getLessConfig() {
        return this.lessConfig;
    }
}
exports.LSConfigManager = LSConfigManager;
exports.lsConfig = new LSConfigManager();
//# sourceMappingURL=ls-config.js.map