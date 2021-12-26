"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static setLogErrorsOnly(logErrorsOnly) {
        Logger.logErrorsOnly = logErrorsOnly;
    }
    static log(...args) {
        if (!Logger.logErrorsOnly) {
            console.log(...args);
        }
    }
    static error(...args) {
        console.error(...args);
    }
}
exports.Logger = Logger;
Logger.logErrorsOnly = false;
//# sourceMappingURL=logger.js.map