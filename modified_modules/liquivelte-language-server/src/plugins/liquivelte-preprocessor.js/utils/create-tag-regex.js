"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createTagRegex(tagName, flags) {
    return new RegExp(`/<!--[^]*?-->|<${tagName}(\\s[^]*?)?(?:>([^]*?)<\\/${tagName}>|\\/>)`, flags);
}
exports.default = createTagRegex;
//# sourceMappingURL=create-tag-regex.js.map