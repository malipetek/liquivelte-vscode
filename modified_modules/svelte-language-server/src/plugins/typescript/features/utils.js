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
exports.gatherIdentifiers = exports.isInReactiveStatement = exports.isReactiveStatement = exports.findNodeAtSpan = exports.findContainingNode = exports.isAfterSvelte2TsxPropsReturn = exports.SnapshotFragmentMap = exports.isPartOfImportStatement = exports.isNoTextSpanInGeneratedCode = exports.isInGeneratedCode = exports.isComponentAtPosition = exports.getComponentAtPosition = void 0;
const typescript_1 = require("typescript");
const documents_1 = require("../../../lib/documents");
const ComponentInfoProvider_1 = require("../ComponentInfoProvider");
const utils_1 = require("../../../utils");
/**
 * If the given original position is within a Svelte starting tag,
 * return the snapshot of that component.
 */
function getComponentAtPosition(lang, doc, tsDoc, originalPosition) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (tsDoc.parserError) {
            return null;
        }
        if (documents_1.isInTag(originalPosition, doc.scriptInfo) ||
            documents_1.isInTag(originalPosition, doc.moduleScriptInfo)) {
            // Inside script tags -> not a component
            return null;
        }
        const node = documents_1.getNodeIfIsInComponentStartTag(doc.html, doc.offsetAt(originalPosition));
        if (!node) {
            return null;
        }
        const fragment = yield tsDoc.getFragment();
        const generatedPosition = fragment.getGeneratedPosition(doc.positionAt(node.start + 1));
        const def = (_a = lang.getDefinitionAtPosition(tsDoc.filePath, fragment.offsetAt(generatedPosition))) === null || _a === void 0 ? void 0 : _a[0];
        if (!def) {
            return null;
        }
        return ComponentInfoProvider_1.JsOrTsComponentInfoProvider.create(lang, def);
    });
}
exports.getComponentAtPosition = getComponentAtPosition;
function isComponentAtPosition(doc, tsDoc, originalPosition) {
    if (tsDoc.parserError) {
        return false;
    }
    if (documents_1.isInTag(originalPosition, doc.scriptInfo) ||
        documents_1.isInTag(originalPosition, doc.moduleScriptInfo)) {
        // Inside script tags -> not a component
        return false;
    }
    return !!documents_1.getNodeIfIsInComponentStartTag(doc.html, doc.offsetAt(originalPosition));
}
exports.isComponentAtPosition = isComponentAtPosition;
/**
 * Checks if this a section that should be completely ignored
 * because it's purely generated.
 */
function isInGeneratedCode(text, start, end) {
    const lastStart = text.lastIndexOf('/*Ωignore_startΩ*/', start);
    const lastEnd = text.lastIndexOf('/*Ωignore_endΩ*/', start);
    const nextEnd = text.indexOf('/*Ωignore_endΩ*/', end);
    return lastStart > lastEnd && lastStart < nextEnd;
}
exports.isInGeneratedCode = isInGeneratedCode;
/**
 * Checks that this isn't a text span that should be completely ignored
 * because it's purely generated.
 */
function isNoTextSpanInGeneratedCode(text, span) {
    return !isInGeneratedCode(text, span.start, span.start + span.length);
}
exports.isNoTextSpanInGeneratedCode = isNoTextSpanInGeneratedCode;
function isPartOfImportStatement(text, position) {
    const line = documents_1.getLineAtPosition(position, text);
    return /\s*from\s+["'][^"']*/.test(line.slice(0, position.character));
}
exports.isPartOfImportStatement = isPartOfImportStatement;
class SnapshotFragmentMap {
    constructor(resolver) {
        this.resolver = resolver;
        this.map = new Map();
    }
    set(fileName, content) {
        this.map.set(fileName, content);
    }
    get(fileName) {
        return this.map.get(fileName);
    }
    getFragment(fileName) {
        var _a;
        return (_a = this.map.get(fileName)) === null || _a === void 0 ? void 0 : _a.fragment;
    }
    retrieve(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            let snapshotFragment = this.get(fileName);
            if (!snapshotFragment) {
                const snapshot = yield this.resolver.getSnapshot(fileName);
                const fragment = yield snapshot.getFragment();
                snapshotFragment = { fragment, snapshot };
                this.set(fileName, snapshotFragment);
            }
            return snapshotFragment;
        });
    }
    retrieveFragment(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.retrieve(fileName)).fragment;
        });
    }
}
exports.SnapshotFragmentMap = SnapshotFragmentMap;
function isAfterSvelte2TsxPropsReturn(text, end) {
    const textBeforeProp = text.substring(0, end);
    // This is how svelte2tsx writes out the props
    if (textBeforeProp.includes('\nreturn { props: {')) {
        return true;
    }
}
exports.isAfterSvelte2TsxPropsReturn = isAfterSvelte2TsxPropsReturn;
function findContainingNode(node, textSpan, predicate) {
    const children = node.getChildren();
    const end = textSpan.start + textSpan.length;
    for (const child of children) {
        if (!(child.getStart() <= textSpan.start && child.getEnd() >= end)) {
            continue;
        }
        if (predicate(child)) {
            return child;
        }
        const foundInChildren = findContainingNode(child, textSpan, predicate);
        if (foundInChildren) {
            return foundInChildren;
        }
    }
}
exports.findContainingNode = findContainingNode;
/**
 * Finds node exactly matching span {start, length}.
 */
function findNodeAtSpan(node, span, predicate) {
    const { start, length } = span;
    const end = start + length;
    for (const child of node.getChildren()) {
        const childStart = child.getStart();
        if (end <= childStart) {
            return;
        }
        const childEnd = child.getEnd();
        if (start >= childEnd) {
            continue;
        }
        if (start === childStart && end === childEnd) {
            if (!predicate) {
                return child;
            }
            if (predicate(child)) {
                return child;
            }
        }
        const foundInChildren = findNodeAtSpan(child, span, predicate);
        if (foundInChildren) {
            return foundInChildren;
        }
    }
}
exports.findNodeAtSpan = findNodeAtSpan;
function isSomeAncestor(node, predicate) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (predicate(parent)) {
            return true;
        }
    }
    return false;
}
/**
 * Tests a node then its parent and successive ancestors for some respective predicates.
 */
function nodeAndParentsSatisfyRespectivePredicates(selfPredicate, ...predicates) {
    return (node) => {
        let next = node;
        return [selfPredicate, ...predicates].every((predicate) => {
            if (!next) {
                return false;
            }
            const current = next;
            next = next.parent;
            return predicate(current);
        });
    };
}
const isRenderFunction = nodeAndParentsSatisfyRespectivePredicates((node) => { var _a; return typescript_1.default.isFunctionDeclaration(node) && ((_a = node === null || node === void 0 ? void 0 : node.name) === null || _a === void 0 ? void 0 : _a.getText()) === 'render'; }, typescript_1.default.isSourceFile);
const isRenderFunctionBody = nodeAndParentsSatisfyRespectivePredicates(typescript_1.default.isBlock, isRenderFunction);
exports.isReactiveStatement = nodeAndParentsSatisfyRespectivePredicates((node) => typescript_1.default.isLabeledStatement(node) && node.label.getText() === '$', utils_1.or(
// function render() {
//     $: x2 = __sveltets_1_invalidate(() => x * x)
// }
isRenderFunctionBody, 
// function render() {
//     ;() => {$: x, update();
// }
nodeAndParentsSatisfyRespectivePredicates(typescript_1.default.isBlock, typescript_1.default.isArrowFunction, typescript_1.default.isExpressionStatement, isRenderFunctionBody)));
const isInReactiveStatement = (node) => isSomeAncestor(node, exports.isReactiveStatement);
exports.isInReactiveStatement = isInReactiveStatement;
function gatherDescendants(node, predicate, dest = []) {
    if (predicate(node)) {
        dest.push(node);
    }
    else {
        for (const child of node.getChildren()) {
            gatherDescendants(child, predicate, dest);
        }
    }
    return dest;
}
const gatherIdentifiers = (node) => gatherDescendants(node, typescript_1.default.isIdentifier);
exports.gatherIdentifiers = gatherIdentifiers;
//# sourceMappingURL=utils.js.map