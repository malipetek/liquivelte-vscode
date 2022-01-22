"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInsideMoustacheTag = exports.getLangAttribute = exports.toRange = exports.getWordAt = exports.getWordRangeAt = exports.getNodeIfIsInStartTag = exports.getNodeIfIsInHTMLStartTag = exports.getNodeIfIsInComponentStartTag = exports.updateRelativeImport = exports.isAtEndOfLine = exports.getLineAtPosition = exports.getTextInRange = exports.isRangeInTag = exports.isInTag = exports.offsetAt = exports.positionAt = exports.extractTemplateTag = exports.extractStyleTag = exports.extractScriptTags = void 0;
const utils_1 = require("../../utils");
const vscode_languageserver_1 = require("vscode-languageserver");
const path = require("path");
const parseHtml_1 = require("./parseHtml");
function parseAttributes(rawAttrs) {
    const attrs = {};
    if (!rawAttrs) {
        return attrs;
    }
    Object.keys(rawAttrs).forEach((attrName) => {
        const attrValue = rawAttrs[attrName];
        attrs[attrName] = attrValue === null ? attrName : removeOuterQuotes(attrValue);
    });
    return attrs;
    function removeOuterQuotes(attrValue) {
        if ((attrValue.startsWith('"') && attrValue.endsWith('"')) ||
            (attrValue.startsWith("'") && attrValue.endsWith("'"))) {
            return attrValue.slice(1, attrValue.length - 1);
        }
        return attrValue;
    }
}
const regexIf = new RegExp('{#if\\s.*?}', 'gms');
const regexIfEnd = new RegExp('{/if}', 'gms');
const regexEach = new RegExp('{#each\\s.*?}', 'gms');
const regexEachEnd = new RegExp('{/each}', 'gms');
const regexAwait = new RegExp('{#await\\s.*?}', 'gms');
const regexAwaitEnd = new RegExp('{/await}', 'gms');
const regexHtml = new RegExp('{@html\\s.*?', 'gms');
/**
 * Extracts a tag (style or script) from the given text
 * and returns its start, end and the attributes on that tag.
 *
 * @param source text content to extract tag from
 * @param tag the tag to extract
 */
function extractTags(text, tag, html) {
    const rootNodes = (html === null || html === void 0 ? void 0 : html.roots) || parseHtml_1.parseHtml(text).roots;
    const matchedNodes = rootNodes
        .filter((node) => node.tag === tag)
        .filter((tag) => {
        return isNotInsideControlFlowTag(tag) && isNotInsideHtmlTag(tag);
    });
    return matchedNodes.map(transformToTagInfo);
    /**
     * For every match AFTER the tag do a search for `{/X`.
     * If that is BEFORE `{#X`, we are inside a moustache tag.
     */
    function isNotInsideControlFlowTag(tag) {
        const nodes = rootNodes.slice(rootNodes.indexOf(tag));
        const rootContentAfterTag = nodes
            .map((node, idx) => {
            var _a, _b;
            const start = node.startTagEnd ? node.end : node.start + (((_a = node.tag) === null || _a === void 0 ? void 0 : _a.length) || 0);
            return text.substring(start, (_b = nodes[idx + 1]) === null || _b === void 0 ? void 0 : _b.start);
        })
            .join('');
        return ![
            [regexIf, regexIfEnd],
            [regexEach, regexEachEnd],
            [regexAwait, regexAwaitEnd]
        ].some((pair) => {
            var _a, _b;
            pair[0].lastIndex = 0;
            pair[1].lastIndex = 0;
            const start = pair[0].exec(rootContentAfterTag);
            const end = pair[1].exec(rootContentAfterTag);
            return ((_a = end === null || end === void 0 ? void 0 : end.index) !== null && _a !== void 0 ? _a : text.length) < ((_b = start === null || start === void 0 ? void 0 : start.index) !== null && _b !== void 0 ? _b : text.length);
        });
    }
    /**
     * For every match BEFORE the tag do a search for `{@html`.
     * If that is BEFORE `}`, we are inside a moustache tag.
     */
    function isNotInsideHtmlTag(tag) {
        const nodes = rootNodes.slice(0, rootNodes.indexOf(tag));
        const rootContentBeforeTag = [{ start: 0, end: 0 }, ...nodes]
            .map((node, idx) => {
            var _a;
            return text.substring(node.end, (_a = nodes[idx]) === null || _a === void 0 ? void 0 : _a.start);
        })
            .join('');
        return !(utils_1.regexLastIndexOf(rootContentBeforeTag, regexHtml) >
            rootContentBeforeTag.lastIndexOf('}'));
    }
    function transformToTagInfo(matchedNode) {
        var _a, _b;
        const start = (_a = matchedNode.startTagEnd) !== null && _a !== void 0 ? _a : matchedNode.start;
        const end = (_b = matchedNode.endTagStart) !== null && _b !== void 0 ? _b : matchedNode.end;
        const startPos = positionAt(start, text);
        const endPos = positionAt(end, text);
        const container = {
            start: matchedNode.start,
            end: matchedNode.end
        };
        const content = text.substring(start, end);
        return {
            content,
            attributes: parseAttributes(matchedNode.attributes),
            start,
            end,
            startPos,
            endPos,
            container
        };
    }
}
function extractScriptTags(source, html) {
    const scripts = extractTags(source, 'script', html);
    if (!scripts.length) {
        return null;
    }
    const script = scripts.find((s) => s.attributes['context'] !== 'module');
    const moduleScript = scripts.find((s) => s.attributes['context'] === 'module');
    return { script, moduleScript };
}
exports.extractScriptTags = extractScriptTags;
function extractStyleTag(source, html) {
    const styles = extractTags(source, 'style', html);
    if (!styles.length) {
        return null;
    }
    // There can only be one style tag
    return styles[0];
}
exports.extractStyleTag = extractStyleTag;
function extractTemplateTag(source, html) {
    const templates = extractTags(source, 'template', html);
    if (!templates.length) {
        return null;
    }
    // There should only be one style tag
    return templates[0];
}
exports.extractTemplateTag = extractTemplateTag;
/**
 * Get the line and character based on the offset
 * @param offset The index of the position
 * @param text The text for which the position should be retrived
 */
function positionAt(offset, text) {
    offset = utils_1.clamp(offset, 0, text.length);
    const lineOffsets = getLineOffsets(text);
    let low = 0;
    let high = lineOffsets.length;
    if (high === 0) {
        return vscode_languageserver_1.Position.create(0, offset);
    }
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (lineOffsets[mid] > offset) {
            high = mid;
        }
        else {
            low = mid + 1;
        }
    }
    // low is the least x for which the line offset is larger than the current offset
    // or array.length if no line offset is larger than the current offset
    const line = low - 1;
    return vscode_languageserver_1.Position.create(line, offset - lineOffsets[line]);
}
exports.positionAt = positionAt;
/**
 * Get the offset of the line and character position
 * @param position Line and character position
 * @param text The text for which the offset should be retrived
 */
function offsetAt(position, text) {
    const lineOffsets = getLineOffsets(text);
    if (position.line >= lineOffsets.length) {
        return text.length;
    }
    else if (position.line < 0) {
        return 0;
    }
    const lineOffset = lineOffsets[position.line];
    const nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : text.length;
    return utils_1.clamp(nextLineOffset, lineOffset, lineOffset + position.character);
}
exports.offsetAt = offsetAt;
function getLineOffsets(text) {
    const lineOffsets = [];
    let isLineStart = true;
    for (let i = 0; i < text.length; i++) {
        if (isLineStart) {
            lineOffsets.push(i);
            isLineStart = false;
        }
        const ch = text.charAt(i);
        isLineStart = ch === '\r' || ch === '\n';
        if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
            i++;
        }
    }
    if (isLineStart && text.length > 0) {
        lineOffsets.push(text.length);
    }
    return lineOffsets;
}
function isInTag(position, tagInfo) {
    return !!tagInfo && utils_1.isInRange(vscode_languageserver_1.Range.create(tagInfo.startPos, tagInfo.endPos), position);
}
exports.isInTag = isInTag;
function isRangeInTag(range, tagInfo) {
    return isInTag(range.start, tagInfo) && isInTag(range.end, tagInfo);
}
exports.isRangeInTag = isRangeInTag;
function getTextInRange(range, text) {
    return text.substring(offsetAt(range.start, text), offsetAt(range.end, text));
}
exports.getTextInRange = getTextInRange;
function getLineAtPosition(position, text) {
    return text.substring(offsetAt({ line: position.line, character: 0 }, text), offsetAt({ line: position.line, character: Number.MAX_VALUE }, text));
}
exports.getLineAtPosition = getLineAtPosition;
/**
 * Assumption: Is called with a line. A line does only contain line break characters
 * at its end.
 */
function isAtEndOfLine(line, offset) {
    return [undefined, '\r', '\n'].includes(line[offset]);
}
exports.isAtEndOfLine = isAtEndOfLine;
/**
 * Updates a relative import
 *
 * @param oldPath Old absolute path
 * @param newPath New absolute path
 * @param relativeImportPath Import relative to the old path
 */
function updateRelativeImport(oldPath, newPath, relativeImportPath) {
    let newImportPath = path
        .join(path.relative(newPath, oldPath), relativeImportPath)
        .replace(/\\/g, '/');
    if (!newImportPath.startsWith('.')) {
        newImportPath = './' + newImportPath;
    }
    return newImportPath;
}
exports.updateRelativeImport = updateRelativeImport;
/**
 * Returns the node if offset is inside a component's starttag
 */
function getNodeIfIsInComponentStartTag(html, offset) {
    const node = html.findNodeAt(offset);
    if (!!node.tag &&
        node.tag[0] === node.tag[0].toUpperCase() &&
        (!node.startTagEnd || offset < node.startTagEnd)) {
        return node;
    }
}
exports.getNodeIfIsInComponentStartTag = getNodeIfIsInComponentStartTag;
/**
 * Returns the node if offset is inside a HTML starttag
 */
function getNodeIfIsInHTMLStartTag(html, offset) {
    const node = html.findNodeAt(offset);
    if (!!node.tag &&
        node.tag[0] === node.tag[0].toLowerCase() &&
        (!node.startTagEnd || offset < node.startTagEnd)) {
        return node;
    }
}
exports.getNodeIfIsInHTMLStartTag = getNodeIfIsInHTMLStartTag;
/**
 * Returns the node if offset is inside a starttag (HTML or component)
 */
function getNodeIfIsInStartTag(html, offset) {
    const node = html.findNodeAt(offset);
    if (!!node.tag && (!node.startTagEnd || offset < node.startTagEnd)) {
        return node;
    }
}
exports.getNodeIfIsInStartTag = getNodeIfIsInStartTag;
/**
 * Gets word range at position.
 * Delimiter is by default a whitespace, but can be adjusted.
 */
function getWordRangeAt(str, pos, delimiterRegex = { left: /\S+$/, right: /\s/ }) {
    let start = str.slice(0, pos).search(delimiterRegex.left);
    if (start < 0) {
        start = pos;
    }
    let end = str.slice(pos).search(delimiterRegex.right);
    if (end < 0) {
        end = str.length;
    }
    else {
        end = end + pos;
    }
    return { start, end };
}
exports.getWordRangeAt = getWordRangeAt;
/**
 * Gets word at position.
 * Delimiter is by default a whitespace, but can be adjusted.
 */
function getWordAt(str, pos, delimiterRegex = { left: /\S+$/, right: /\s/ }) {
    const { start, end } = getWordRangeAt(str, pos, delimiterRegex);
    return str.slice(start, end);
}
exports.getWordAt = getWordAt;
/**
 * Returns start/end offset of a text into a range
 */
function toRange(str, start, end) {
    return vscode_languageserver_1.Range.create(positionAt(start, str), positionAt(end, str));
}
exports.toRange = toRange;
/**
 * Returns the language from the given tags, return the first from which a language is found.
 * Searches inside lang and type and removes leading 'text/'
 */
function getLangAttribute(...tags) {
    const tag = tags.find((tag) => (tag === null || tag === void 0 ? void 0 : tag.attributes.lang) || (tag === null || tag === void 0 ? void 0 : tag.attributes.type));
    if (!tag) {
        return null;
    }
    const attribute = tag.attributes.lang || tag.attributes.type;
    if (!attribute) {
        return null;
    }
    return attribute.replace(/^text\//, '');
}
exports.getLangAttribute = getLangAttribute;
/**
 * Checks whether given position is inside a moustache tag (which includes control flow tags)
 * using a simple bracket matching heuristic which might fail under conditions like
 * `{#if {a: true}.a}`
 */
function isInsideMoustacheTag(html, tagStart, position) {
    if (tagStart === null) {
        // Not inside <tag ... >
        const charactersBeforePosition = html.substring(0, position);
        return (Math.max(
        // TODO make this just check for '{'?
        // Theoretically, someone could do {a < b} in a simple moustache tag
        charactersBeforePosition.lastIndexOf('{#'), charactersBeforePosition.lastIndexOf('{:')) > charactersBeforePosition.lastIndexOf('}'));
    }
    else {
        // Inside <tag ... >
        const charactersInNode = html.substring(tagStart, position);
        return charactersInNode.lastIndexOf('{') > charactersInNode.lastIndexOf('}');
    }
}
exports.isInsideMoustacheTag = isInsideMoustacheTag;
//# sourceMappingURL=utils.js.map