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
exports.DiagnosticsProviderImpl = void 0;
const typescript_1 = require("typescript");
const vscode_languageserver_1 = require("vscode-languageserver");
const documents_1 = require("../../../lib/documents");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const utils_3 = require("../../../utils");
var DiagnosticCode;
(function (DiagnosticCode) {
    DiagnosticCode[DiagnosticCode["MODIFIERS_CANNOT_APPEAR_HERE"] = 1184] = "MODIFIERS_CANNOT_APPEAR_HERE";
    DiagnosticCode[DiagnosticCode["USED_BEFORE_ASSIGNED"] = 2454] = "USED_BEFORE_ASSIGNED";
    DiagnosticCode[DiagnosticCode["JSX_ELEMENT_DOES_NOT_SUPPORT_ATTRIBUTES"] = 2607] = "JSX_ELEMENT_DOES_NOT_SUPPORT_ATTRIBUTES";
    DiagnosticCode[DiagnosticCode["CANNOT_BE_USED_AS_JSX_COMPONENT"] = 2786] = "CANNOT_BE_USED_AS_JSX_COMPONENT";
    DiagnosticCode[DiagnosticCode["NOOP_IN_COMMAS"] = 2695] = "NOOP_IN_COMMAS";
    DiagnosticCode[DiagnosticCode["NEVER_READ"] = 6133] = "NEVER_READ";
    DiagnosticCode[DiagnosticCode["ALL_IMPORTS_UNUSED"] = 6192] = "ALL_IMPORTS_UNUSED";
    DiagnosticCode[DiagnosticCode["UNUSED_LABEL"] = 7028] = "UNUSED_LABEL";
    DiagnosticCode[DiagnosticCode["DUPLICATED_JSX_ATTRIBUTES"] = 17001] = "DUPLICATED_JSX_ATTRIBUTES"; // "JSX elements cannot have multiple attributes with the same name."
})(DiagnosticCode || (DiagnosticCode = {}));
class DiagnosticsProviderImpl {
    constructor(lsAndTsDocResolver) {
        this.lsAndTsDocResolver = lsAndTsDocResolver;
    }
    getDiagnostics(document, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lang, tsDoc } = yield this.getLSAndTSDoc(document);
            if (['coffee', 'coffeescript'].includes(document.getLanguageAttribute('script')) ||
                (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested)) {
                return [];
            }
            const isTypescript = tsDoc.scriptKind === typescript_1.default.ScriptKind.TSX;
            // Document preprocessing failed, show parser error instead
            if (tsDoc.parserError) {
                return [
                    {
                        range: tsDoc.parserError.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        source: isTypescript ? 'ts' : 'js',
                        message: tsDoc.parserError.message,
                        code: tsDoc.parserError.code
                    }
                ];
            }
            const fragment = yield tsDoc.getFragment();
            let diagnostics = [
                ...lang.getSyntacticDiagnostics(tsDoc.filePath),
                ...lang.getSuggestionDiagnostics(tsDoc.filePath),
                ...lang.getSemanticDiagnostics(tsDoc.filePath)
            ];
            diagnostics = diagnostics
                .filter(isNotGenerated(tsDoc.getText(0, tsDoc.getLength())))
                .filter(utils_3.not(isUnusedReactiveStatementLabel));
            diagnostics = resolveNoopsInReactiveStatements(lang, diagnostics);
            return diagnostics
                .map((diagnostic) => ({
                range: utils_1.convertRange(tsDoc, diagnostic),
                severity: utils_1.mapSeverity(diagnostic.category),
                source: isTypescript ? 'ts' : 'js',
                message: typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                code: diagnostic.code,
                tags: utils_1.getDiagnosticTag(diagnostic)
            }))
                .map(mapRange(fragment, document))
                .filter(hasNoNegativeLines)
                .filter(isNoFalsePositive(document, tsDoc))
                .map(enhanceIfNecessary)
                .map(swapDiagRangeStartEndIfNecessary);
        });
    }
    getLSAndTSDoc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.lsAndTsDocResolver.getLSAndTSDoc(document);
        });
    }
}
exports.DiagnosticsProviderImpl = DiagnosticsProviderImpl;
function mapRange(fragment, document) {
    return (diagnostic) => {
        let range = documents_1.mapRangeToOriginal(fragment, diagnostic.range);
        if (range.start.line < 0) {
            const is$$PropsError = utils_2.isAfterSvelte2TsxPropsReturn(fragment.text, fragment.offsetAt(diagnostic.range.start)) && diagnostic.message.includes('$$Props');
            if (is$$PropsError) {
                const propsStart = utils_3.regexIndexOf(document.getText(), /(interface|type)\s+\$\$Props[\s{=]/);
                if (propsStart) {
                    const start = document.positionAt(propsStart + document.getText().substring(propsStart).indexOf('$$Props'));
                    range = {
                        start,
                        end: Object.assign(Object.assign({}, start), { character: start.character + '$$Props'.length })
                    };
                }
            }
        }
        return Object.assign(Object.assign({}, diagnostic), { range });
    };
}
function findDiagnosticNode(diagnostic) {
    const { file, start, length } = diagnostic;
    if (!file || !start || !length) {
        return;
    }
    const span = { start, length };
    return utils_2.findNodeAtSpan(file, span);
}
function copyDiagnosticAndChangeNode(diagnostic) {
    return (node) => (Object.assign(Object.assign({}, diagnostic), { start: node.getStart(), length: node.getWidth() }));
}
/**
 * In some rare cases mapping of diagnostics does not work and produces negative lines.
 * We filter out these diagnostics with negative lines because else the LSP
 * apparently has a hickup and does not show any diagnostics at all.
 */
function hasNoNegativeLines(diagnostic) {
    return diagnostic.range.start.line >= 0 && diagnostic.range.end.line >= 0;
}
function isNoFalsePositive(document, tsDoc) {
    const text = document.getText();
    const usesPug = document.getLanguageAttribute('template') === 'pug';
    return (diagnostic) => {
        return (isNoJsxCannotHaveMultipleAttrsError(diagnostic) &&
            isNoUsedBeforeAssigned(diagnostic, text, tsDoc) &&
            (!usesPug || isNoPugFalsePositive(diagnostic, document)));
    };
}
/**
 * All diagnostics inside the template tag and the unused import/variable diagnostics
 * are marked as false positive.
 */
function isNoPugFalsePositive(diagnostic, document) {
    return (!documents_1.isRangeInTag(diagnostic.range, document.templateInfo) &&
        diagnostic.code !== DiagnosticCode.NEVER_READ &&
        diagnostic.code !== DiagnosticCode.ALL_IMPORTS_UNUSED);
}
/**
 * Variable used before being assigned, can happen when  you do `export let x`
 * without assigning a value in strict mode. Should not throw an error here
 * but on the component-user-side ("you did not set a required prop").
 */
function isNoUsedBeforeAssigned(diagnostic, text, tsDoc) {
    if (diagnostic.code !== DiagnosticCode.USED_BEFORE_ASSIGNED) {
        return true;
    }
    return !tsDoc.hasProp(documents_1.getTextInRange(diagnostic.range, text));
}
/**
 * Jsx cannot have multiple attributes with same name,
 * but that's allowed for svelte
 */
function isNoJsxCannotHaveMultipleAttrsError(diagnostic) {
    return diagnostic.code !== DiagnosticCode.DUPLICATED_JSX_ATTRIBUTES;
}
/**
 * Some diagnostics have JSX-specific nomenclature. Enhance them for more clarity.
 */
function enhanceIfNecessary(diagnostic) {
    if (diagnostic.code === DiagnosticCode.CANNOT_BE_USED_AS_JSX_COMPONENT) {
        return Object.assign(Object.assign({}, diagnostic), { message: 'Type definitions are missing for this Svelte Component. ' +
                // eslint-disable-next-line max-len
                "It needs a class definition with at least the property '$$prop_def' which should contain a map of input property definitions.\n" +
                'Example:\n' +
                '  class ComponentName { $$prop_def: { propertyName: string; } }\n' +
                'If you are using Svelte 3.31+, use SvelteComponentTyped:\n' +
                '  import type { SvelteComponentTyped } from "svelte";\n' +
                '  class ComponentName extends SvelteComponentTyped<{propertyName: string;}> {}\n\n' +
                'Underlying error:\n' +
                diagnostic.message });
    }
    if (diagnostic.code === DiagnosticCode.JSX_ELEMENT_DOES_NOT_SUPPORT_ATTRIBUTES) {
        return Object.assign(Object.assign({}, diagnostic), { message: 'Element does not support attributes because ' +
                'type definitions are missing for this Svelte Component or element cannot be used as such.\n\n' +
                'Underlying error:\n' +
                diagnostic.message });
    }
    if (diagnostic.code === DiagnosticCode.MODIFIERS_CANNOT_APPEAR_HERE) {
        return Object.assign(Object.assign({}, diagnostic), { message: diagnostic.message +
                '\nIf this is a declare statement, move it into <script context="module">..</script>' });
    }
    return diagnostic;
}
/**
 * Due to source mapping, some ranges may be swapped: Start is end. Swap back in this case.
 */
function swapDiagRangeStartEndIfNecessary(diag) {
    diag.range = utils_3.swapRangeStartEndIfNecessary(diag.range);
    return diag;
}
/**
 * Checks if diagnostic is not within a section that should be completely ignored
 * because it's purely generated.
 */
function isNotGenerated(text) {
    return (diagnostic) => {
        if (diagnostic.start === undefined || diagnostic.length === undefined) {
            return true;
        }
        return !utils_2.isInGeneratedCode(text, diagnostic.start, diagnostic.start + diagnostic.length);
    };
}
function isUnusedReactiveStatementLabel(diagnostic) {
    if (diagnostic.code !== DiagnosticCode.UNUSED_LABEL) {
        return false;
    }
    const diagNode = findDiagnosticNode(diagnostic);
    if (!diagNode) {
        return false;
    }
    // TS warning targets the identifier
    if (!typescript_1.default.isIdentifier(diagNode)) {
        return false;
    }
    if (!diagNode.parent) {
        return false;
    }
    return utils_2.isReactiveStatement(diagNode.parent);
}
/**
 * Checks if diagnostics should be ignored because they report an unused expression* in
 * a reactive statement, and those actually have side effects in Svelte (hinting deps).
 *
 *     $: x, update()
 *
 * Only `let` (i.e. reactive) variables are ignored. For the others, new diagnostics are
 * emitted, centered on the (non reactive) identifiers in the initial warning.
 */
function resolveNoopsInReactiveStatements(lang, diagnostics) {
    const isLet = (file) => (node) => {
        const defs = lang.getDefinitionAtPosition(file.fileName, node.getStart());
        return !!defs && defs.some((def) => def.fileName === file.fileName && def.kind === 'let');
    };
    const expandRemainingNoopWarnings = (diagnostic) => {
        const { code, file } = diagnostic;
        // guard: missing info
        if (!file) {
            return;
        }
        // guard: not target error
        const isNoopDiag = code === DiagnosticCode.NOOP_IN_COMMAS;
        if (!isNoopDiag) {
            return;
        }
        const diagNode = findDiagnosticNode(diagnostic);
        if (!diagNode) {
            return;
        }
        if (!utils_2.isInReactiveStatement(diagNode)) {
            return;
        }
        return (
        // for all identifiers in diagnostic node
        utils_2.gatherIdentifiers(diagNode)
            // ignore `let` (i.e. reactive) variables
            .filter(utils_3.not(isLet(file)))
            // and create targeted diagnostics just for the remaining ids
            .map(copyDiagnosticAndChangeNode(diagnostic)));
    };
    const expandedDiagnostics = utils_3.flatten(utils_3.passMap(diagnostics, expandRemainingNoopWarnings));
    return expandedDiagnostics.length === diagnostics.length
        ? expandedDiagnostics
        : // This can generate duplicate diagnostics
            expandedDiagnostics.filter(dedupDiagnostics());
}
function dedupDiagnostics() {
    const hashDiagnostic = (diag) => [diag.start, diag.length, diag.category, diag.source, diag.code]
        .map((x) => JSON.stringify(x))
        .join(':');
    const known = new Set();
    return (diag) => {
        const key = hashDiagnostic(diag);
        if (known.has(key)) {
            return false;
        }
        else {
            known.add(key);
            return true;
        }
    };
}
//# sourceMappingURL=DiagnosticsProvider.js.map