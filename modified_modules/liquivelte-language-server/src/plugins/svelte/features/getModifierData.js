"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModifierData = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
function getModifierData() {
    return [
        {
            modifier: 'preventDefault',
            documentation: 'calls `event.preventDefault()` before running the handler',
            modifiersInvalidWith: ['passive']
        },
        {
            modifier: 'stopPropagation',
            documentation: 'calls `event.stopPropagation()`, preventing the event reaching the next element'
        },
        {
            modifier: 'passive',
            documentation: 'improves scrolling performance on touch/wheel events ' +
                "(Svelte will add it automatically where it's safe to do so)",
            modifiersInvalidWith: ['nopassive', 'preventDefault']
        },
        {
            modifier: 'nonpassive',
            documentation: 'explicitly set `passive: false`',
            modifiersInvalidWith: ['passive']
        },
        {
            modifier: 'capture',
            documentation: 'fires the handler during the capture phase instead of the bubbling phase'
        },
        {
            modifier: 'once',
            documentation: 'remove the handler after the first time it runs'
        },
        {
            modifier: 'self',
            documentation: 'only trigger handler if `event.target` is the element itself'
        },
        {
            modifier: 'trusted',
            documentation: 'only trigger handler if event.isTrusted is true. ' +
                'I.e. if the event is triggered by a user action'
        }
    ].map((item) => (Object.assign(Object.assign({}, item), { documentation: {
            kind: vscode_languageserver_1.MarkupKind.Markdown,
            value: `\`${item.modifier}\` event modifier

${item.documentation}

https://svelte.dev/docs#on_element_event`
        } })));
}
exports.getModifierData = getModifierData;
//# sourceMappingURL=getModifierData.js.map