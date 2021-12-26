import { Node } from 'vscode-html-languageservice';
import { Position, Range } from 'vscode-languageserver';
declare type Predicate<T> = (x: T) => boolean;
export declare function not<T>(predicate: Predicate<T>): (x: T) => boolean;
export declare function or<T>(...predicates: Array<Predicate<T>>): (x: T) => boolean;
export declare function and<T>(...predicates: Array<Predicate<T>>): (x: T) => boolean;
export declare function clamp(num: number, min: number, max: number): number;
export declare function urlToPath(stringUrl: string): string | null;
export declare function pathToUrl(path: string): string;
/**
 * Some paths (on windows) start with a upper case driver letter, some don't.
 * This is normalized here.
 */
export declare function normalizePath(path: string): string;
/**
 * URIs coming from the client could be encoded in a different
 * way than expected / than the internal services create them.
 * This normalizes them to be the same as the internally generated ones.
 */
export declare function normalizeUri(uri: string): string;
/**
 * Given a path like foo/bar or foo/bar.svelte , returns its last path
 * (bar or bar.svelte in this example).
 */
export declare function getLastPartOfPath(path: string): string;
export declare function flatten<T>(arr: Array<T | T[]>): T[];
/**
 * Map or keep original (passthrough) if the mapper returns undefined.
 */
export declare function passMap<T>(array: T[], mapper: (x: T) => void | T[]): (T | T[])[];
export declare function isInRange(range: Range, positionToTest: Position): boolean;
export declare function isRangeStartAfterEnd(range: Range): boolean;
export declare function swapRangeStartEndIfNecessary(range: Range): Range;
export declare function moveRangeStartToEndIfNecessary(range: Range): Range;
export declare function isBeforeOrEqualToPosition(position: Position, positionToTest: Position): boolean;
export declare function isNotNullOrUndefined<T>(val: T | undefined | null): val is T;
/**
 * Debounces a function but cancels previous invocation only if
 * a second function determines it should.
 *
 * @param fn The function with it's argument
 * @param determineIfSame The function which determines if the previous invocation should be canceld or not
 * @param miliseconds Number of miliseconds to debounce
 */
export declare function debounceSameArg<T>(fn: (arg: T) => void, shouldCancelPrevious: (newArg: T, prevArg?: T) => boolean, miliseconds: number): (arg: T) => void;
/**
 * Debounces a function but also waits at minimum the specified number of miliseconds until
 * the next invocation. This avoids needless calls when a synchronous call (like diagnostics)
 * took too long and the whole timeout of the next call was eaten up already.
 *
 * @param fn The function with it's argument
 * @param miliseconds Number of miliseconds to debounce/throttle
 */
export declare function debounceThrottle<T extends (...args: any) => void>(fn: T, miliseconds: number): T;
/**
 * Like str.lastIndexOf, but for regular expressions. Note that you need to provide the g-flag to your RegExp!
 */
export declare function regexLastIndexOf(text: string, regex: RegExp, endPos?: number): number;
/**
 * Like str.indexOf, but for regular expressions.
 */
export declare function regexIndexOf(text: string, regex: RegExp, startPos?: number): number;
/**
 * Get all matches of a regexp.
 */
export declare function getRegExpMatches(regex: RegExp, str: string): RegExpExecArray[];
/**
 * Function to modify each line of a text, preserving the line break style (`\n` or `\r\n`)
 */
export declare function modifyLines(text: string, replacementFn: (line: string, lineIdx: number) => string): string;
/**
 * Like array.filter, but asynchronous
 */
export declare function filterAsync<T>(array: T[], predicate: (t: T, idx: number) => Promise<boolean>): Promise<T[]>;
export declare function getIndent(text: string): string;
/**
 *
 * The html language service is case insensitive, and would provide
 * hover/ completion info for Svelte components like `Option` which have
 * the same name like a html tag.
 *
 * Also, svelte directives like action and event modifier only work
 * with element not component
 */
export declare function possiblyComponent(node: Node): boolean;
/**
 * If the object if it has entries, else undefined
 */
export declare function returnObjectIfHasKeys<T>(obj: T | undefined): T | undefined;
export {};
