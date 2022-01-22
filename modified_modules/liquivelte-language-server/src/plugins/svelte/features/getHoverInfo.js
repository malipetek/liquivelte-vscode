"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHoverInfo = void 0;
const SvelteTags_1 = require("./SvelteTags");
const utils_1 = require("../../../utils");
const documents_1 = require("../../../lib/documents");
const parseHtml_1 = require("../../../lib/documents/parseHtml");
const utils_2 = require("./utils");
const getModifierData_1 = require("./getModifierData");
/**
 * Get hover information for special svelte tags within moustache tags.
 */
function getHoverInfo(document, svelteDoc, position) {
    const offset = svelteDoc.offsetAt(position);
    const isInStyleOrScript = documents_1.isInTag(position, svelteDoc.style) ||
        documents_1.isInTag(position, svelteDoc.script) ||
        documents_1.isInTag(position, svelteDoc.moduleScript);
    const offsetStart = Math.max(offset - 10, 0);
    const charactersAroundOffset = svelteDoc
        .getText()
        // use last 10 and next 10 characters, should cover 99% of all cases
        .substr(offsetStart, 20);
    const isSvelteTag = tagRegexp.test(charactersAroundOffset);
    if (isInStyleOrScript) {
        return null;
    }
    if (isSvelteTag) {
        return getTagHoverInfoAtOffset(svelteDoc, offsetStart, charactersAroundOffset, offset);
    }
    const attributeContext = parseHtml_1.getAttributeContextAtPosition(document, position);
    if (!attributeContext || !utils_2.attributeCanHaveEventModifier(attributeContext)) {
        return null;
    }
    const attributeOffset = svelteDoc.getText().lastIndexOf(attributeContext.name, offset);
    return getEventModifierHoverInfo(attributeContext, attributeOffset, offset);
}
exports.getHoverInfo = getHoverInfo;
function getTagHoverInfoAtOffset(svelteDoc, charactersOffset, charactersAroundOffset, offset) {
    const tag = getTagAtOffset(svelteDoc, charactersOffset, charactersAroundOffset, offset);
    if (!tag) {
        return null;
    }
    return { contents: SvelteTags_1.documentation[tag] };
}
/**
 * Get the tag that is at the offset.
 */
function getTagAtOffset(svelteDoc, charactersOffset, charactersAroundOffset, offset) {
    const foundTag = tagPossibilities.find((tagAndValues) => tagAndValues.values.find((value) => isAroundOffset(charactersOffset, charactersAroundOffset, value, offset)));
    if (!foundTag) {
        return null;
    }
    if (foundTag.tag !== ':else') {
        return foundTag.tag;
    }
    // ':else can be part of one of each, await, if --> find out which one
    return SvelteTags_1.getLatestOpeningTag(svelteDoc, offset);
}
function isAroundOffset(charactersOffset, charactersAroundOffset, toFind, offset) {
    const match = charactersAroundOffset.match(toFind);
    if (!match || match.index === undefined) {
        return false;
    }
    const idx = match.index + charactersOffset;
    return idx <= offset && idx + toFind.length >= offset;
}
const tagPossibilities = [
    { tag: 'if', values: ['#if', '/if', ':else if'] },
    // each
    { tag: 'each', values: ['#each', '/each'] },
    // await
    { tag: 'await', values: ['#await', '/await', ':then', ':catch'] },
    // key
    { tag: 'key', values: ['#key', '/key'] },
    // @
    { tag: 'html', values: ['@html'] },
    { tag: 'debug', values: ['@debug'] },
    // this tag has multiple possibilities
    { tag: ':else', values: [':else'] }
];
const tagRegexp = new RegExp(`[\\s\\S]*{\\s*(${utils_1.flatten(tagPossibilities.map((p) => p.values)).join('|')})(\\s|})`);
function getEventModifierHoverInfo(attributeContext, attributeOffset, offset) {
    const { name } = attributeContext;
    const modifierData = getModifierData_1.getModifierData();
    const found = modifierData.find((modifier) => isAroundOffset(attributeOffset, name, modifier.modifier, offset));
    if (!found) {
        return null;
    }
    return {
        contents: found.documentation
    };
}
//# sourceMappingURL=getHoverInfo.js.map