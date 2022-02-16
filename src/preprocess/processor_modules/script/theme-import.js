"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uid_1 = require("uid");
const get_line_from_offset_1 = __importDefault(require("../../../utils/get-line-from-offset"));
function themeImportProcessor(script, ms, { liquidImportsModule, subImportsRegistryModule }) {
    const replaceOperations = [];
    script.replace(/import\s+(.*?)(\..*?)?\s*from\s*['"]theme['"]/gim, (a, obj, subObject, offset) => {
        const line = get_line_from_offset_1.default(script, offset);
        const id = `sub_import${uid_1.uid()}`;
        if (subObject) {
            /* -------------------------------------------------------------------------- */
            /*              IMPORT FROM THEME IS SOMETHING LIKE product.image             */
            /* -------------------------------------------------------------------------- */
            const entry = {
                id: `${obj}${subObject.replace(/\./gi, '$$')}`,
                importStatement: `${obj}${subObject}`
            };
            // TODO: selection lines are not matching source of problem might be here
            if (!subImportsRegistryModule.some(subImport => subImport.id === entry.id)) {
                subImportsRegistryModule.push(entry);
            }
            ms.overwrite(offset, offset + a.length, `export let ${obj}${subObject.replace(/\./gi, '$$')}; \n${obj}${subObject} = ${obj}${subObject.replace(/\./gi, '$$')}`);
            replaceOperations.push({
                was: {
                    lines: [line]
                },
                operation: {
                    lines: [line, line + 1]
                },
                linesAdded: 1,
                explanation: `${obj}${subObject.replace(/\./gi, '$$')} will be imported as a top level prop. [var]$[var] syntax is for internal use.`
            });
            return '';
        }
        else {
            /* -------------------------------------------------------------------------- */
            /*         IMPORT FROM THEME IS SOMETHING LIKE product from 'theme'           */
            /* -------------------------------------------------------------------------- */
            if (!liquidImportsModule.some(liquidImport => liquidImport === obj)) {
                liquidImportsModule.push(obj);
            }
            ms.remove(offset, offset + 'import '.length);
            ms.appendLeft(offset, 'export let ');
            ms.remove(offset + ('import ' + obj).length, offset + ('import ' + obj).length + ' from \'theme\''.length);
            replaceOperations.push({
                was: {
                    lines: [line]
                },
                operation: {
                    lines: [line]
                },
                explanation: `${obj} will be imported as a prop when initializing. Check the script tag in liquid built.`
            });
            // ms.overwrite(offset, offset + a.length, `export let ${obj}`);
            return '';
        }
    });
    const result = {
        magicString: ms,
        subImportsRegistryModule,
        liquidImportsModule,
        replaceOperations,
    };
    return result;
}
exports.default = themeImportProcessor;
//# sourceMappingURL=theme-import.js.map