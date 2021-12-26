"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attributeCanHaveEventModifier = void 0;
const utils_1 = require("../../../utils");
function attributeCanHaveEventModifier(attributeContext) {
    return (!attributeContext.inValue &&
        !utils_1.possiblyComponent(attributeContext.elementTag) &&
        attributeContext.name.startsWith('on:') &&
        attributeContext.name.includes('|'));
}
exports.attributeCanHaveEventModifier = attributeCanHaveEventModifier;
//# sourceMappingURL=utils.js.map