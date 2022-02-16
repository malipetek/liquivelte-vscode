"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/naming-convention */
const compiler_1 = require("svelte/compiler");
const magic_string_1 = __importDefault(require("magic-string"));
const expression_1 = __importDefault(require("./processor_modules/markup/expression"));
const theme_import_1 = __importDefault(require("./processor_modules/script/theme-import"));
const liquivelte_import_1 = __importDefault(require("./processor_modules/script/liquivelte-import"));
const ifstatement_1 = __importDefault(require("./processor_modules/markup/ifstatement"));
const rawinclude_1 = __importDefault(require("./processor_modules/markup/rawinclude"));
const path_1 = __importDefault(require("path"));
const strip_tags_1 = __importDefault(require("../utils/strip-tags"));
async function applyReplaces(replacers, content, filename) {
    const replaceOperations = [];
    let liquidImportsModule = [];
    let subImportsRegistryModule = [];
    let rawIncludeRegistry = [];
    let liquidContent = content;
    const options = {
        filename,
        indentExclusionRanges: [],
    };
    let magicString = new magic_string_1.default(content, options);
    for (let replacer of replacers) {
        const replaceResult = await replacer(content, magicString, { liquidContent, liquidImportsModule, subImportsRegistryModule, rawIncludeRegistry });
        // magicString = replaceResult.magicString;
        liquidContent = replaceResult.liquidContent ? replaceResult.liquidContent : liquidContent;
        // liquidImportsModule = [...liquidImportsModule, ...(replaceResult.liquidImportsModule || [])];
        // subImportsRegistryModule = [...subImportsRegistryModule, ...(replaceResult.subImportsRegistryModule || [])];
        // rawIncludeRegistry = [...rawIncludeRegistry, ...(replaceResult.rawIncludeRegistry || [])];
        // replaceOperations.push(...replaceResult.replaceOperations);
    }
    return { magicString, replaceOperations, liquidContent, subImportsRegistryModule, liquidImportsModule, rawIncludeRegistry };
}
async function liquivelteTransformer(documentContent, fileUri) {
    let liquidContent = documentContent;
    const file = path_1.default.parse(fileUri.fsPath);
    let RR = {
        magicString: new magic_string_1.default(documentContent),
        replaceOperations: [],
        liquidContent: '',
        subImportsRegistryModule: [],
        liquidImportsModule: [],
        rawIncludeRegistry: []
    };
    const { code, map } = await compiler_1.preprocess(documentContent, {
        markup: async ({ content, filename }) => {
            RR = await applyReplaces([
                theme_import_1.default,
                expression_1.default,
                liquivelte_import_1.default,
                ifstatement_1.default,
                rawinclude_1.default
            ], content, filename);
            return {
                code: RR.magicString.toString(),
                map: RR.magicString.generateMap()
            };
        },
        script: ({ content, attributes, markup, filename }) => {
            if (filename === undefined) {
                return {
                    code: content,
                    map: undefined
                };
            }
            const options = {
                filename,
                indentExclusionRanges: [],
            };
            const s = new magic_string_1.default(content, options);
            s.append(`
${RR.rawIncludeRegistry.reduce((acc, rawInclude) => `${acc}
export let ${rawInclude.id}
`, '')}`);
            return {
                code: s.toString(),
                map: s.generateMap()
            };
        }
    }, {
        filename: `${file.name}.svelte`,
    });
    RR.exportedVariables = [];
    RR.exportedObjectVariables = [];
    documentContent.replace(/export\slet\s([^=]+)\s*=\s*(\{[^\}]+\})?/gi, (a, v, o) => {
        if (o) {
            RR.exportedObjectVariables.push({ [v.trim()]: eval(`(() => (${o}))()`) });
        }
        else {
            RR.exportedVariables.push(v.trim());
        }
        return '';
    });
    // replaceOperations,
    // liquidContent,
    // subImportsRegistryModule,
    // liquidImportsModule,
    // rawIncludeRegistry
    RR.liquidContent = strip_tags_1.default(RR.liquidContent);
    return { content: code, map, exportedVariables: [], exportedObjectVariables: [], ...RR };
}
exports.default = liquivelteTransformer;
//# sourceMappingURL=preprocessor.js.map