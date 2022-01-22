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
exports.SignatureHelpProviderImpl = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const previewer_1 = require("../previewer");
class SignatureHelpProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    getSignatureHelp(document, position, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.lsAndTsDocResolver.getLSAndTSDoc(document);
            const fragment = yield tsDoc.getFragment();
            if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                return null;
            }
            const offset = fragment.offsetAt(fragment.getGeneratedPosition(position));
            const triggerReason = this.toTsTriggerReason(context);
            const info = lang.getSignatureHelpItems(tsDoc.filePath, offset, triggerReason ? { triggerReason } : undefined);
            if (!info ||
                info.items.some((signature) => this.isInSvelte2tsxGeneratedFunction(signature))) {
                return null;
            }
            const signatures = info.items.map(this.toSignatureHelpInformation);
            return {
                signatures,
                activeSignature: info.selectedItemIndex,
                activeParameter: info.argumentIndex
            };
        });
    }
    isReTrigger(isRetrigger, triggerCharacter) {
        return (isRetrigger &&
            (this.isTriggerCharacter(triggerCharacter) ||
                SignatureHelpProviderImpl.retriggerCharacters.includes(triggerCharacter)));
    }
    isTriggerCharacter(triggerCharacter) {
        return SignatureHelpProviderImpl.triggerCharacters.includes(triggerCharacter);
    }
    /**
     * adopted from https://github.com/microsoft/vscode/blob/265a2f6424dfbd3a9788652c7d376a7991d049a3/extensions/typescript-language-features/src/languageFeatures/signatureHelp.ts#L103
     */
    toTsTriggerReason(context) {
        switch (context === null || context === void 0 ? void 0 : context.triggerKind) {
            case vscode_languageserver_1.SignatureHelpTriggerKind.TriggerCharacter:
                if (context.triggerCharacter) {
                    if (this.isReTrigger(context.isRetrigger, context.triggerCharacter)) {
                        return { kind: 'retrigger', triggerCharacter: context.triggerCharacter };
                    }
                    if (this.isTriggerCharacter(context.triggerCharacter)) {
                        return {
                            kind: 'characterTyped',
                            triggerCharacter: context.triggerCharacter
                        };
                    }
                }
                return { kind: 'invoked' };
            case vscode_languageserver_1.SignatureHelpTriggerKind.ContentChange:
                return context.isRetrigger ? { kind: 'retrigger' } : { kind: 'invoked' };
            case vscode_languageserver_1.SignatureHelpTriggerKind.Invoked:
            default:
                return { kind: 'invoked' };
        }
    }
    /**
     * adopted from https://github.com/microsoft/vscode/blob/265a2f6424dfbd3a9788652c7d376a7991d049a3/extensions/typescript-language-features/src/languageFeatures/signatureHelp.ts#L73
     */
    toSignatureHelpInformation(item) {
        const [prefixLabel, separatorLabel, suffixLabel] = [
            item.prefixDisplayParts,
            item.separatorDisplayParts,
            item.suffixDisplayParts
        ].map(typescript_1.default.displayPartsToString);
        let textIndex = prefixLabel.length;
        let signatureLabel = '';
        const parameters = [];
        const lastIndex = item.parameters.length - 1;
        item.parameters.forEach((parameter, index) => {
            const label = typescript_1.default.displayPartsToString(parameter.displayParts);
            const startIndex = textIndex;
            const endIndex = textIndex + label.length;
            const doc = typescript_1.default.displayPartsToString(parameter.documentation);
            signatureLabel += label;
            parameters.push(vscode_languageserver_1.ParameterInformation.create([startIndex, endIndex], doc));
            if (index < lastIndex) {
                textIndex = endIndex + separatorLabel.length;
                signatureLabel += separatorLabel;
            }
        });
        const signatureDocumentation = previewer_1.getMarkdownDocumentation(item.documentation, item.tags.filter((tag) => tag.name !== 'param'));
        return {
            label: prefixLabel + signatureLabel + suffixLabel,
            documentation: signatureDocumentation
                ? {
                    value: signatureDocumentation,
                    kind: vscode_languageserver_1.MarkupKind.Markdown
                }
                : undefined,
            parameters
        };
    }
    isInSvelte2tsxGeneratedFunction(signatureHelpItem) {
        return signatureHelpItem.prefixDisplayParts.some((part) => part.text.includes('__sveltets'));
    }
}
exports.SignatureHelpProviderImpl = SignatureHelpProviderImpl;
SignatureHelpProviderImpl.triggerCharacters = ['(', ',', '<'];
SignatureHelpProviderImpl.retriggerCharacters = [')'];
//# sourceMappingURL=SignatureHelpProvider.js.map