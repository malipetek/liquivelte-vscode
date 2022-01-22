import { Position, TextDocument } from 'vscode-languageserver';
/**
 * Represents a textual document.
 */
export declare abstract class ReadableDocument implements TextDocument {
    /**
     * Get the text content of the document
     */
    abstract getText(): string;
    /**
     * Returns the url of the document
     */
    abstract getURL(): string;
    /**
     * Returns the file path if the url scheme is file
     */
    abstract getFilePath(): string | null;
    /**
     * Current version of the document.
     */
    version: number;
    /**
     * Get the length of the document's content
     */
    getTextLength(): number;
    /**
     * Get the line and character based on the offset
     * @param offset The index of the position
     */
    positionAt(offset: number): Position;
    /**
     * Get the index of the line and character position
     * @param position Line and character position
     */
    offsetAt(position: Position): number;
    private getLineOffsets;
    /**
     * Implements TextDocument
     */
    get uri(): string;
    get lineCount(): number;
    abstract languageId: string;
}
/**
 * Represents a textual document that can be manipulated.
 */
export declare abstract class WritableDocument extends ReadableDocument {
    /**
     * Set the text content of the document
     * @param text The new text content
     */
    abstract setText(text: string): void;
    /**
     * Update the text between two positions.
     * @param text The new text slice
     * @param start Start offset of the new text
     * @param end End offset of the new text
     */
    update(text: string, start: number, end: number): void;
}
