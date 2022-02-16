"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const create_tag_regex_1 = __importDefault(require("./create-tag-regex"));
function default_1(markup, tagsToStrip) {
    tagsToStrip = tagsToStrip || ['style', 'script'];
    return tagsToStrip.map(tag => create_tag_regex_1.default(tag, 'gim'))
        .reduce((col, reg) => col.replace(reg, ''), markup);
}
exports.default = default_1;
//# sourceMappingURL=strip-tags.js.map