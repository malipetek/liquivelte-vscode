"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SvelteCheck = exports.offsetAt = void 0;
__exportStar(require("./server"), exports);
var documents_1 = require("./lib/documents");
Object.defineProperty(exports, "offsetAt", { enumerable: true, get: function () { return documents_1.offsetAt; } });
var svelte_check_1 = require("./svelte-check");
Object.defineProperty(exports, "SvelteCheck", { enumerable: true, get: function () { return svelte_check_1.SvelteCheck; } });
//# sourceMappingURL=index.js.map