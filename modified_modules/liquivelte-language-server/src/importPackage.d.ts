import * as prettier from 'prettier';
import * as svelte from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';
export declare function setIsTrusted(_isTrusted: boolean): void;
export declare function getPackageInfo(packageName: string, fromPath: string): {
    path: string;
    version: {
        full: any;
        major: number;
        minor: number;
        patch: number;
    };
};
export declare function importPrettier(fromPath: string): typeof prettier;
export declare function importSvelte(fromPath: string): typeof svelte;
export declare function importSveltePreprocess(fromPath: string): typeof sveltePreprocess;
