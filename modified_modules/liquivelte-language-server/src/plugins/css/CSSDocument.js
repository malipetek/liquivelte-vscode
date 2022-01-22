"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSSDocument = void 0;
const service_1 = require("./service");
const documents_1 = require("../../lib/documents");
class CSSDocument extends documents_1.ReadableDocument {
    constructor(parent) {
        super();
        this.parent = parent;
        this.version = this.parent.version;
        if (this.parent.styleInfo) {
            this.styleInfo = this.parent.styleInfo;
        }
        else {
            this.styleInfo = {
                attributes: {},
                start: -1,
                end: -1
            };
        }
        this.languageId = this.language;
        this.stylesheet = service_1.getLanguageService(this.language).parseStylesheet(this);
    }
    /**
     * Get the fragment position relative to the parent
     * @param pos Position in fragment
     */
    getOriginalPosition(pos) {
        const parentOffset = this.styleInfo.start + this.offsetAt(pos);
        return this.parent.positionAt(parentOffset);
    }
    /**
     * Get the position relative to the start of the fragment
     * @param pos Position in parent
     */
    getGeneratedPosition(pos) {
        const fragmentOffset = this.parent.offsetAt(pos) - this.styleInfo.start;
        return this.positionAt(fragmentOffset);
    }
    /**
     * Returns true if the given parent position is inside of this fragment
     * @param pos Position in parent
     */
    isInGenerated(pos) {
        const offset = this.parent.offsetAt(pos);
        return offset >= this.styleInfo.start && offset <= this.styleInfo.end;
    }
    /**
     * Get the fragment text from the parent
     */
    getText() {
        return this.parent.getText().slice(this.styleInfo.start, this.styleInfo.end);
    }
    /**
     * Returns the length of the fragment as calculated from the start and end positon
     */
    getTextLength() {
        return this.styleInfo.end - this.styleInfo.start;
    }
    /**
     * Return the parent file path
     */
    getFilePath() {
        return this.parent.getFilePath();
    }
    getURL() {
        return this.parent.getURL();
    }
    getAttributes() {
        return this.styleInfo.attributes;
    }
    get language() {
        const attrs = this.getAttributes();
        return attrs.lang || attrs.type || 'css';
    }
}
exports.CSSDocument = CSSDocument;
//# sourceMappingURL=CSSDocument.js.map