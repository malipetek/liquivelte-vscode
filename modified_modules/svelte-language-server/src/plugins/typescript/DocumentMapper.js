"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerDocumentMapper = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../lib/documents");
class ConsumerDocumentMapper extends documents_1.SourceMapDocumentMapper {
    constructor(consumer, sourceUri, nrPrependesLines) {
        super(consumer, sourceUri);
        this.nrPrependesLines = nrPrependesLines;
    }
    getOriginalPosition(generatedPosition) {
        return super.getOriginalPosition(vscode_languageserver_1.Position.create(generatedPosition.line - this.nrPrependesLines, generatedPosition.character));
    }
    getGeneratedPosition(originalPosition) {
        const result = super.getGeneratedPosition(originalPosition);
        result.line += this.nrPrependesLines;
        return result;
    }
    isInGenerated() {
        // always return true and map outliers case by case
        return true;
    }
}
exports.ConsumerDocumentMapper = ConsumerDocumentMapper;
//# sourceMappingURL=DocumentMapper.js.map