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
exports.PluginHost = void 0;
const lodash_1 = require("lodash");
const vscode_languageserver_1 = require("vscode-languageserver");
const logger_1 = require("../logger");
const utils_1 = require("../utils");
var ExecuteMode;
(function (ExecuteMode) {
    ExecuteMode[ExecuteMode["None"] = 0] = "None";
    ExecuteMode[ExecuteMode["FirstNonNull"] = 1] = "FirstNonNull";
    ExecuteMode[ExecuteMode["Collect"] = 2] = "Collect";
})(ExecuteMode || (ExecuteMode = {}));
class PluginHost {
    constructor(documentsManager) {
        this.documentsManager = documentsManager;
        this.plugins = [];
        this.pluginHostConfig = {
            filterIncompleteCompletions: true,
            definitionLinkSupport: false
        };
        this.deferredRequests = {};
    }
    initialize(pluginHostConfig) {
        this.pluginHostConfig = pluginHostConfig;
    }
    register(plugin) {
        this.plugins.push(plugin);
    }
    didUpdateDocument() {
        this.deferredRequests = {};
    }
    getDiagnostics(textDocument) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            if ((((_a = document.getFilePath()) === null || _a === void 0 ? void 0 : _a.includes('/node_modules/')) ||
                ((_b = document.getFilePath()) === null || _b === void 0 ? void 0 : _b.includes('\\node_modules\\'))) &&
                // Sapper convention: Put stuff inside node_modules below src
                !(((_c = document.getFilePath()) === null || _c === void 0 ? void 0 : _c.includes('/src/node_modules/')) ||
                    ((_d = document.getFilePath()) === null || _d === void 0 ? void 0 : _d.includes('\\src\\node_modules\\')))) {
                // Don't return diagnostics for files inside node_modules. These are considered read-only (cannot be changed)
                // and in case of svelte-check they would pollute/skew the output
                return [];
            }
            return lodash_1.flatten(yield this.execute('getDiagnostics', [document], ExecuteMode.Collect, 'high'));
        });
    }
    doHover(textDocument, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return this.execute('doHover', [document, position], ExecuteMode.FirstNonNull, 'high');
        });
    }
    getCompletions(textDocument, position, completionContext, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            const completions = (yield this.execute('getCompletions', [document, position, completionContext, cancellationToken], ExecuteMode.Collect, 'high')).filter((completion) => completion != null);
            let flattenedCompletions = lodash_1.flatten(completions.map((completion) => completion.items));
            const isIncomplete = completions.reduce((incomplete, completion) => incomplete || completion.isIncomplete, false);
            // If the result is incomplete, we need to filter the results ourselves
            // to throw out non-matching results. VSCode does filter client-side,
            // but other IDEs might not.
            if (isIncomplete && this.pluginHostConfig.filterIncompleteCompletions) {
                const offset = document.offsetAt(position);
                // Assumption for performance reasons:
                // Noone types import names longer than 20 characters and still expects perfect autocompletion.
                const text = document.getText().substring(Math.max(0, offset - 20), offset);
                const start = utils_1.regexLastIndexOf(text, /[\W\s]/g) + 1;
                const filterValue = text.substring(start).toLowerCase();
                flattenedCompletions = flattenedCompletions.filter((comp) => comp.label.toLowerCase().includes(filterValue));
            }
            return vscode_languageserver_1.CompletionList.create(flattenedCompletions, isIncomplete);
        });
    }
    resolveCompletion(textDocument, completionItem, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            const result = yield this.execute('resolveCompletion', [document, completionItem, cancellationToken], ExecuteMode.FirstNonNull, 'high');
            return result !== null && result !== void 0 ? result : completionItem;
        });
    }
    formatDocument(textDocument, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return lodash_1.flatten(yield this.execute('formatDocument', [document, options], ExecuteMode.Collect, 'high'));
        });
    }
    doTagComplete(textDocument, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return this.execute('doTagComplete', [document, position], ExecuteMode.FirstNonNull, 'high');
        });
    }
    getDocumentColors(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return lodash_1.flatten(yield this.execute('getDocumentColors', [document], ExecuteMode.Collect, 'low'));
        });
    }
    getColorPresentations(textDocument, range, color) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return lodash_1.flatten(yield this.execute('getColorPresentations', [document, range, color], ExecuteMode.Collect, 'high'));
        });
    }
    getDocumentSymbols(textDocument, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return lodash_1.flatten(yield this.execute('getDocumentSymbols', [document, cancellationToken], ExecuteMode.Collect, 'low'));
        });
    }
    getDefinitions(textDocument, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            const definitions = lodash_1.flatten(yield this.execute('getDefinitions', [document, position], ExecuteMode.Collect, 'high'));
            if (this.pluginHostConfig.definitionLinkSupport) {
                return definitions;
            }
            else {
                return definitions.map((def) => ({ range: def.targetSelectionRange, uri: def.targetUri }));
            }
        });
    }
    getCodeActions(textDocument, range, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return lodash_1.flatten(yield this.execute('getCodeActions', [document, range, context, cancellationToken], ExecuteMode.Collect, 'high'));
        });
    }
    executeCommand(textDocument, command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('executeCommand', [document, command, args], ExecuteMode.FirstNonNull, 'high');
        });
    }
    updateImports(fileRename) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.execute('updateImports', [fileRename], ExecuteMode.FirstNonNull, 'high');
        });
    }
    prepareRename(textDocument, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('prepareRename', [document, position], ExecuteMode.FirstNonNull, 'high');
        });
    }
    rename(textDocument, position, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('rename', [document, position, newName], ExecuteMode.FirstNonNull, 'high');
        });
    }
    findReferences(textDocument, position, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('findReferences', [document, position, context], ExecuteMode.FirstNonNull, 'high');
        });
    }
    getSignatureHelp(textDocument, position, context, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('getSignatureHelp', [document, position, context, cancellationToken], ExecuteMode.FirstNonNull, 'high');
        });
    }
    /**
     * The selection range supports multiple cursors,
     * each position should return its own selection range tree like `Array.map`.
     * Quote the LSP spec
     * > A selection range in the return array is for the position in the provided parameters at the same index. Therefore positions[i] must be contained in result[i].range.
     * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_selectionRange
     *
     * Making PluginHost implement the same interface would make it quite hard to get
     * the corresponding selection range of each position from different plugins.
     * Therefore the special treatment here.
     */
    getSelectionRanges(textDocument, positions) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            try {
                return Promise.all(positions.map((position) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    for (const plugin of this.plugins) {
                        const range = yield ((_a = plugin.getSelectionRange) === null || _a === void 0 ? void 0 : _a.call(plugin, document, position));
                        if (range) {
                            return range;
                        }
                    }
                    return vscode_languageserver_1.SelectionRange.create(vscode_languageserver_1.Range.create(position, position));
                })));
            }
            catch (error) {
                logger_1.Logger.error(error);
                return null;
            }
        });
    }
    getSemanticTokens(textDocument, range, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('getSemanticTokens', [document, range, cancellationToken], ExecuteMode.FirstNonNull, 'low');
        });
    }
    getLinkedEditingRanges(textDocument, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = this.getDocument(textDocument.uri);
            return yield this.execute('getLinkedEditingRanges', [document, position], ExecuteMode.FirstNonNull, 'high');
        });
    }
    getImplementation(textDocument, position) {
        const document = this.getDocument(textDocument.uri);
        return this.execute('getImplementation', [document, position], ExecuteMode.FirstNonNull, 'high');
    }
    onWatchFileChanges(onWatchFileChangesParas) {
        var _a;
        for (const support of this.plugins) {
            (_a = support.onWatchFileChanges) === null || _a === void 0 ? void 0 : _a.call(support, onWatchFileChangesParas);
        }
    }
    updateTsOrJsFile(fileName, changes) {
        var _a;
        for (const support of this.plugins) {
            (_a = support.updateTsOrJsFile) === null || _a === void 0 ? void 0 : _a.call(support, fileName, changes);
        }
    }
    getDocument(uri) {
        const document = this.documentsManager.get(uri);
        if (!document) {
            throw new Error('Cannot call methods on an unopened document');
        }
        return document;
    }
    execute(name, args, mode, priority) {
        return __awaiter(this, void 0, void 0, function* () {
            const plugins = this.plugins.filter((plugin) => typeof plugin[name] === 'function');
            if (priority === 'low') {
                // If a request doesn't have priority, we first wait 1 second to
                // 1. let higher priority requests get through first
                // 2. wait for possible document changes, which make the request wait again
                // Due to waiting, low priority items should preferrably be those who do not
                // rely on positions or ranges and rather on the whole document only.
                const debounce = () => __awaiter(this, void 0, void 0, function* () {
                    const id = Math.random();
                    this.deferredRequests[name] = [
                        id,
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                if (!this.deferredRequests[name] ||
                                    this.deferredRequests[name][0] === id) {
                                    resolve();
                                }
                                else {
                                    // We should not get into this case. According to the spec,
                                    // the language client // does not send another request
                                    // of the same type until the previous one is answered.
                                    reject();
                                }
                            }, 1000);
                        })
                    ];
                    try {
                        yield this.deferredRequests[name][1];
                        if (!this.deferredRequests[name]) {
                            return debounce();
                        }
                        return true;
                    }
                    catch (e) {
                        return false;
                    }
                });
                const shouldContinue = yield debounce();
                if (!shouldContinue) {
                    return;
                }
            }
            switch (mode) {
                case ExecuteMode.FirstNonNull:
                    for (const plugin of plugins) {
                        const res = yield this.tryExecutePlugin(plugin, name, args, null);
                        if (res != null) {
                            return res;
                        }
                    }
                    return null;
                case ExecuteMode.Collect:
                    return Promise.all(plugins.map((plugin) => this.tryExecutePlugin(plugin, name, args, [])));
                case ExecuteMode.None:
                    yield Promise.all(plugins.map((plugin) => this.tryExecutePlugin(plugin, name, args, null)));
                    return;
            }
        });
    }
    tryExecutePlugin(plugin, fnName, args, failValue) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield plugin[fnName](...args);
            }
            catch (e) {
                logger_1.Logger.error(e);
                return failValue;
            }
        });
    }
}
exports.PluginHost = PluginHost;
//# sourceMappingURL=PluginHost.js.map