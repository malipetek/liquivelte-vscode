import ts from 'typescript';
import { DocumentSnapshot } from './DocumentSnapshot';
/**
 * Creates a module loader specifically for `.svelte` files.
 *
 * The typescript language service tries to look up other files that are referenced in the currently open svelte file.
 * For `.ts`/`.js` files this works, for `.svelte` files it does not by default.
 * Reason: The typescript language service does not know about the `.svelte` file ending,
 * so it assumes it's a normal typescript file and searches for files like `../Component.svelte.ts`, which is wrong.
 * In order to fix this, we need to wrap typescript's module resolution and reroute all `.svelte.ts` file lookups to .svelte.
 *
 * @param getSnapshot A function which returns a (in case of svelte file fully preprocessed) typescript/javascript snapshot
 * @param compilerOptions The typescript compiler options
 */
export declare function createSvelteModuleLoader(getSnapshot: (fileName: string) => DocumentSnapshot, compilerOptions: ts.CompilerOptions): {
    fileExists: any;
    readFile: any;
    readDirectory: any;
    deleteFromModuleCache: (path: string) => void;
    deleteUnresolvedResolutionsFromCache: (path: string) => void;
    resolveModuleNames: (moduleNames: string[], containingFile: string) => Array<ts.ResolvedModule | undefined>;
};
