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
exports.HoverProviderImpl = void 0;
const typescript_1 = require("typescript");
const documents_1 = require("../../../lib/documents");
const previewer_1 = require("../previewer");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
class HoverProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    doHover(document, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            const eventHoverInfo = yield this.getEventHoverInfo(lang, document, tsDoc, position);
            if (eventHoverInfo) {
                return eventHoverInfo;
            }
            const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
            let info = lang.getQuickInfoAtPosition(tsDoc.filePath, offset);
            if (!info) {
                return null;
            }
            const textSpan = info.textSpan;
            // show docs of $store instead of store if necessary
            const is$store = fragment.text
                .substring(0, info.textSpan.start)
                .endsWith('(__sveltets_1_store_get(');
            if (is$store) {
                const infoFor$store = lang.getQuickInfoAtPosition(tsDoc.filePath, textSpan.start + textSpan.length + 3);
                if (infoFor$store) {
                    info = infoFor$store;
                }
            }
            const declaration = typescript_1.default.displayPartsToString(info.displayParts);
            const documentation = previewer_1.getMarkdownDocumentation(info.documentation, info.tags);
            // https://microsoft.github.io/language-server-protocol/specification#textDocument_hover
            const contents = ['```typescript', declaration, '```']
                .concat(documentation ? ['---', documentation] : [])
                .join('\n');
            return documents_1.mapObjWithRangeToOriginal(fragment, {
                range: utils_1.convertRange(fragment, textSpan),
                contents
            });
        });
    }
    getEventHoverInfo(lang, doc, tsDoc, originalPosition) {
        return __awaiter(this, void 0, void 0, function* () {
            const possibleEventName = documents_1.getWordAt(doc.getText(), doc.offsetAt(originalPosition), {
                left: /\S+$/,
                right: /[\s=]/
            });
            if (!possibleEventName.startsWith('on:')) {
                return null;
            }
            const component = yield utils_2.getComponentAtPosition(lang, doc, tsDoc, originalPosition);
            if (!component) {
                return null;
            }
            const eventName = possibleEventName.substr('on:'.length);
            const event = component.getEvents().find((event) => event.name === eventName);
            if (!event) {
                return null;
            }
            return {
                contents: [
                    '```typescript',
                    `${event.name}: ${event.type}`,
                    '```',
                    event.doc || ''
                ].join('\n')
            };
        });
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
}
exports.HoverProviderImpl = HoverProviderImpl;
//# sourceMappingURL=HoverProvider.js.map