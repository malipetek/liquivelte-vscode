"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(str) {
    return str.replace(/(^\w)/, w => w.toLowerCase()).replace(/[A-Z]/g, w => '-' + w.toLowerCase());
}
exports.default = default_1;
//# sourceMappingURL=to-kebab-case.js.map