import { Position, Range } from 'vscode-languageserver';
import { Node, HTMLDocument } from 'vscode-html-languageservice';
export interface TagInformation {
    content: string;
    attributes: Record<string, string>;
    start: number;
    end: number;
    startPos: Position;
    endPos: Position;
    container: {
        start: number;
        end: number;
    };
}
export declare function extractScriptTags(source: string, html?: HTMLDocument): {
    script?: TagInformation;
    moduleScript?: TagInformation;
} | null;
export declare function extractStyleTag(source: string, html?: HTMLDocument): TagInformation | null;
export declare function extractTemplateTag(source: string, html?: HTMLDocument): TagInformation | null;
/**
 * Get the line and character based on the offset
 * @param offset The index of the position
 * @param text The text for which the position should be retrived
 */
export declare function positionAt(offset: number, text: string): Position;
/**
 * Get the offset of the line and character position
 * @param position Line and character position
 * @param text The text for which the offset should be retrived
 */
export declare function offsetAt(position: Position, text: string): number;
export declare function isInTag(position: Position, tagInfo: TagInformation | null): tagInfo is TagInformation;
export declare function isRangeInTag(range: Range, tagInfo: TagInformation | null): tagInfo is TagInformation;
export declare function getTextInRange(range: Range, text: string): string;
export declare function getLineAtPosition(position: Position, text: string): string;
/**
 * Assumption: Is called with a line. A line does only contain line break characters
 * at its end.
 */
export declare function isAtEndOfLine(line: string, offset: number): boolean;
/**
 * Updates a relative import
 *
 * @param oldPath Old absolute path
 * @param newPath New absolute path
 * @param relativeImportPath Import relative to the old path
 */
export declare function updateRelativeImport(oldPath: string, newPath: string, relativeImportPath: string): string;
/**
 * Returns the node if offset is inside a component's starttag
 */
export declare function getNodeIfIsInComponentStartTag(html: HTMLDocument, offset: number): Node | undefined;
/**
 * Returns the node if offset is inside a HTML starttag
 */
export declare function getNodeIfIsInHTMLStartTag(html: HTMLDocument, offset: number): Node | undefined;
/**
 * Returns the node if offset is inside a starttag (HTML or component)
 */
export declare function getNodeIfIsInStartTag(html: HTMLDocument, offset: number): Node | undefined;
/**
 * Gets word range at position.
 * Delimiter is by default a whitespace, but can be adjusted.
 */
export declare function getWordRangeAt(str: string, pos: number, delimiterRegex?: {
    left: RegExp;
    right: RegExp;
}): {
    start: number;
    end: number;
};
/**
 * Gets word at position.
 * Delimiter is by default a whitespace, but can be adjusted.
 */
export declare function getWordAt(str: string, pos: number, delimiterRegex?: {
    left: RegExp;
    right: RegExp;
}): string;
/**
 * Returns start/end offset of a text into a range
 */
export declare function toRange(str: string, start: number, end: number): Range;
/**
 * Returns the language from the given tags, return the first from which a language is found.
 * Searches inside lang and type and removes leading 'text/'
 */
export declare function getLangAttribute(...tags: Array<TagInformation | null>): string | null;
/**
 * Checks whether given position is inside a moustache tag (which includes control flow tags)
 * using a simple bracket matching heuristic which might fail under conditions like
 * `{#if {a: true}.a}`
 */
export declare function isInsideMoustacheTag(html: string, tagStart: number | null, position: number): boolean;
