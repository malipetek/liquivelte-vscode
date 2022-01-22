import { SvelteDocument } from '../SvelteDocument';
/**
 * Special svelte syntax tags that do template logic.
 */
export declare type SvelteLogicTag = 'each' | 'if' | 'await' | 'key';
/**
 * Special svelte syntax tags.
 */
export declare type SvelteTag = SvelteLogicTag | 'html' | 'debug';
/**
 * For each tag, a documentation in markdown format.
 */
export declare const documentation: {
    await: string;
    each: string;
    if: string;
    key: string;
    html: string;
    debug: string;
};
/**
 * Get the last tag that is opened but not closed.
 */
export declare function getLatestOpeningTag(svelteDoc: SvelteDocument, offset: number): SvelteLogicTag | null;
