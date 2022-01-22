import { CompileOptions } from 'svelte/types/compiler/interfaces';
import { PreprocessorGroup } from 'svelte/types/compiler/preprocess/types';
import _glob from 'fast-glob';
import _path from 'path';
import _fs from 'fs';
import { URL } from 'url';
export declare type InternalPreprocessorGroup = PreprocessorGroup & {
    /**
     * svelte-preprocess has this since 4.x
     */
    defaultLanguages?: {
        markup?: string;
        script?: string;
        style?: string;
    };
};
export interface SvelteConfig {
    compilerOptions?: CompileOptions;
    preprocess?: InternalPreprocessorGroup | InternalPreprocessorGroup[];
    loadConfigError?: any;
}
/**
 * This function encapsulates the import call in a way
 * that TypeScript does not transpile `import()`.
 * https://github.com/microsoft/TypeScript/issues/43329
 */
declare const _dynamicImport: (modulePath: URL) => Promise<any>;
/**
 * Loads svelte.config.{js,cjs,mjs} files. Provides both a synchronous and asynchronous
 * interface to get a config file because snapshots need access to it synchronously.
 * This means that another instance (the ts service host on startup) should make
 * sure that all config files are loaded before snapshots are retrieved.
 * Asynchronousity is needed because we use the dynamic `import()` statement.
 */
export declare class ConfigLoader {
    private globSync;
    private fs;
    private path;
    private dynamicImport;
    private configFiles;
    private configFilesAsync;
    private filePathToConfigPath;
    private disabled;
    constructor(globSync: typeof _glob.sync, fs: Pick<typeof _fs, 'existsSync'>, path: Pick<typeof _path, 'dirname' | 'relative' | 'join'>, dynamicImport: typeof _dynamicImport);
    /**
     * Enable/disable loading of configs (for security reasons for example)
     */
    setDisabled(disabled: boolean): void;
    /**
     * Tries to load all `svelte.config.js` files below given directory
     * and the first one found inside/above that directory.
     *
     * @param directory Directory where to load the configs from
     */
    loadConfigs(directory: string): Promise<void>;
    private addFallbackConfig;
    private searchConfigPathUpwards;
    private loadAndCacheConfig;
    private loadConfig;
    /**
     * Returns config associated to file. If no config is found, the file
     * was called in a context where no config file search was done before,
     * which can happen
     * - if TS intellisense is turned off and the search did not run on tsconfig init
     * - if the file was opened not through the TS service crawl, but through the LSP
     *
     * @param file
     */
    getConfig(file: string): SvelteConfig | undefined;
    /**
     * Like `getConfig`, but will search for a config above if no config found.
     */
    awaitConfig(file: string): Promise<SvelteConfig | undefined>;
    private tryGetConfig;
    private useFallbackPreprocessor;
}
export declare const configLoader: ConfigLoader;
export {};
