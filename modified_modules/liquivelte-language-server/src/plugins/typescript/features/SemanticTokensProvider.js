"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticTokensProviderImpl = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const CONTENT_LENGTH_LIMIT = 50000;
class SemanticTokensProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    getSemanticTokens(textDocument, range, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.lsAndTsDocResolver.getLSAndTSDoc(textDocument);
            const fragment = yield tsDoc.getFragment();
            // for better performance, don't do full-file semantic tokens when the file is too big
            if ((!range && fragment.text.length > CONTENT_LENGTH_LIMIT) ||
                (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested)) {
                return null;
            }
            // No script tags -> nothing to analyse semantic tokens for
            if (!textDocument.scriptInfo && !textDocument.moduleScriptInfo) {
                return null;
            }
            const textSpan = range
                ? utils_1.convertToTextSpan(range, fragment)
                : {
                    start: 0,
                    length: tsDoc.parserError
                        ? fragment.text.length
                        : // This is appended by svelte2tsx, there's nothing mappable afterwards
                            fragment.text.lastIndexOf('return { props:') || fragment.text.length
                };
            const { spans } = lang.getEncodedSemanticClassifications(tsDoc.filePath, textSpan, typescript_1.default.SemanticClassificationFormat.TwentyTwenty);
            const data = [];
            let index = 0;
            while (index < spans.length) {
                // [start, length, encodedClassification, start2, length2, encodedClassification2]
                const generatedOffset = spans[index++];
                const generatedLength = spans[index++];
                const encodedClassification = spans[index++];
                const classificationType = this.getTokenTypeFromClassification(encodedClassification);
                if (classificationType < 0) {
                    continue;
                }
                const originalPosition = this.mapToOrigin(textDocument, fragment, generatedOffset, generatedLength);
                if (!originalPosition) {
                    continue;
                }
                const [line, character, length] = originalPosition;
                // remove identifiers whose start and end mapped to the same location,
                // like the svelte2tsx inserted render function,
                // or reversed like Component.$on
                if (length <= 0) {
                    continue;
                }
                const modifier = this.getTokenModifierFromClassification(encodedClassification);
                data.push([line, character, length, classificationType, modifier]);
            }
            const sorted = data.sort((a, b) => {
                const [lineA, charA] = a;
                const [lineB, charB] = b;
                return lineA - lineB || charA - charB;
            });
            const builder = new vscode_languageserver_1.SemanticTokensBuilder();
            sorted.forEach((tokenData) => builder.push(...tokenData));
            return builder.build();
        });
    }
    mapToOrigin(document, fragment, generatedOffset, generatedLength) {
        if (utils_2.isInGeneratedCode(fragment.text, generatedOffset, generatedOffset + generatedLength)) {
            return;
        }
        const range = {
            start: fragment.positionAt(generatedOffset),
            end: fragment.positionAt(generatedOffset + generatedLength)
        };
        const { start: startPosition, end: endPosition } = documents_1.mapRangeToOriginal(fragment, range);
        if (startPosition.line < 0 || endPosition.line < 0) {
            return;
        }
        const startOffset = document.offsetAt(startPosition);
        const endOffset = document.offsetAt(endPosition);
        return [startPosition.line, startPosition.character, endOffset - startOffset];
    }
    /**
     *  TSClassification = (TokenType + 1) << TokenEncodingConsts.typeOffset + TokenModifier
     */
    getTokenTypeFromClassification(tsClassification) {
        return (tsClassification >> 8 /* typeOffset */) - 1;
    }
    getTokenModifierFromClassification(tsClassification) {
        return tsClassification & 255 /* modifierMask */;
    }
}
exports.SemanticTokensProviderImpl = SemanticTokensProviderImpl;
//# sourceMappingURL=SemanticTokensProvider.js.map