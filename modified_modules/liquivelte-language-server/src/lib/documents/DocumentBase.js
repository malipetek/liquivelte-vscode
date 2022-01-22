"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WritableDocument = exports.ReadableDocument = void 0;
const utils_1 = require("../../utils");
const vscode_languageserver_1 = require("vscode-languageserver");
/**
 * Represents a textual document.
 */
class ReadableDocument {
    constructor() {
        /**
         * Current version of the document.
         */
        this.version = 0;
    }
    /**
     * Get the length of the document's content
     */
    getTextLength() {
        return this.getText().length;
    }
    /**
     * Get the line and character based on the offset
     * @param offset The index of the position
     */
    positionAt(offset) {
        offset = utils_1.clamp(offset, 0, this.getTextLength());
        const lineOffsets = this.getLineOffsets();
        let low = 0;
        let high = lineOffsets.length;
        if (high === 0) {
            return vscode_languageserver_1.Position.create(0, offset);
        }
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (lineOffsets[mid] > offset) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        const line = low - 1;
        return vscode_languageserver_1.Position.create(line, offset - lineOffsets[line]);
    }
    /**
     * Get the index of the line and character position
     * @param position Line and character position
     */
    offsetAt(position) {
        const lineOffsets = this.getLineOffsets();
        if (position.line >= lineOffsets.length) {
            return this.getTextLength();
        }
        else if (position.line < 0) {
            return 0;
        }
        const lineOffset = lineOffsets[position.line];
        const nextLineOffset = position.line + 1 < lineOffsets.length
            ? lineOffsets[position.line + 1]
            : this.getTextLength();
        return utils_1.clamp(nextLineOffset, lineOffset, lineOffset + position.character);
    }
    getLineOffsets() {
        const lineOffsets = [];
        const text = this.getText();
        let isLineStart = true;
        for (let i = 0; i < text.length; i++) {
            if (isLineStart) {
                lineOffsets.push(i);
                isLineStart = false;
            }
            const ch = text.charAt(i);
            isLineStart = ch === '\r' || ch === '\n';
            if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
                i++;
            }
        }
        if (isLineStart && text.length > 0) {
            lineOffsets.push(text.length);
        }
        return lineOffsets;
    }
    /**
     * Implements TextDocument
     */
    get uri() {
        return this.getURL();
    }
    get lineCount() {
        return this.getText().split(/\r?\n/).length;
    }
}
exports.ReadableDocument = ReadableDocument;
/**
 * Represents a textual document that can be manipulated.
 */
class WritableDocument extends ReadableDocument {
    /**
     * Update the text between two positions.
     * @param text The new text slice
     * @param start Start offset of the new text
     * @param end End offset of the new text
     */
    update(text, start, end) {
        const content = this.getText();
        this.setText(content.slice(0, start) + text + content.slice(end));
    }
}
exports.WritableDocument = WritableDocument;
//# sourceMappingURL=DocumentBase.js.map