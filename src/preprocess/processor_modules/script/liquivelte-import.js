"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_line_from_offset_1 = __importDefault(require("../../../utils/get-line-from-offset"));
const create_tag_regex_1 = __importDefault(require("../../../utils/create-tag-regex"));
const arrow_function_props_1 = require("../../../utils/arrow-function-props");
const parse_props_1 = __importDefault(require("../../../utils/parse-props"));
const path_1 = __importDefault(require("path"));
function liquivelteImportProcessor(script, ms, { liquidContent, liquidImportsModule, subImportsRegistryModule }) {
    const replaceOperations = [];
    let modules = [];
    script.replace(/import\s+(.+)\s+from\s+['"](.+)\.liquivelte['"]/gi, (a, module, filename, offset) => {
        const line = get_line_from_offset_1.default(script, offset);
        filename = path_1.default.parse(filename).name;
        modules.push({ module, filename });
        replaceOperations.push({
            was: {
                lines: [line]
            },
            operation: {
                lines: [line]
            },
            explanation: `imported liquivelte modules
      {% capture slot_content %}{% endcapture %} be included in the theme side.`
        });
        return '';
    });
    modules.forEach(({ module, filename }) => {
        module = module.replace(/\{|\}/g, '');
        arrow_function_props_1.stripArrowFunctions(script).replace(create_tag_regex_1.default(module, 'gi'), (a, props, children, offset) => {
            // console.log(props, children, offset);
            // liquidImportsModule, subImportsRegistryModule
            const liquidImportProps = liquidImportsModule.reduce((c, imp) => `${c} ${imp}={${imp}}`, '') || '';
            // @ts-ignore
            const subImportProps = subImportsRegistryModule.reduce((c, imp) => `${c} ${imp.id}={${imp.id}}`, '') || '';
            ms.overwrite(offset, offset + a.length - children.length - `</${module}>`.length, `<${module} ${props || ''} ${liquidImportProps} ${subImportProps} >`);
            return '';
        });
        liquidContent = arrow_function_props_1.stripArrowFunctions(liquidContent).replace(create_tag_regex_1.default(module, 'gi'), (a, props, children, offset) => {
            let propsParsed = parse_props_1.default(props);
            Object.keys(propsParsed).forEach(key => propsParsed[key] = arrow_function_props_1.putBackArrowFunctions(propsParsed[key]));
            // count newlines
            const line = get_line_from_offset_1.default(script, offset);
            // ms.overwrite(offset, offset + a.length, a);
            replaceOperations.push({
                was: {
                    lines: [line]
                },
                operation: {
                    lines: [line]
                },
                explanation: `This is a liquvete module, its template be included in the theme side.`
            });
            if (propsParsed.spread) {
                const [propsObject] = (script.match(new RegExp(`${propsParsed.spread}\\s*=\\s*(\\{[^\\}]+\\})`, 'gim')) || []);
                delete propsParsed.spread;
                if (propsObject) {
                    const spreadProps = eval(propsObject);
                    propsParsed = { ...propsParsed, ...spreadProps };
                }
            }
            return `
{% comment %}
kvsp stands for "key value separator"
prsp stands for "props separator"
{% endcomment %}
{% comment %}
scs stands for "slot component separator"
scvs stands for "slot component value separator"
{% endcomment %}
{% capture props %}${Object.keys(propsParsed).map(key => `${key}-kvsp-${propsParsed[key]}`).reduce((c, a) => `${c}${c ? '-prsp-' : ''}${a}`, '')}{% endcapture %}
{% capture slot_content_${module} %}${children}{% endcapture %}
{% assign slot_contents = slot_contents | append: '-scs-' | append: '${filename}' | append: '-scvs-' | append: slot_content_${module} %}

{% include 'svelte', module: '${filename}', props: props, sub_include: true %}
{% assign props = '' %}`;
        });
    });
    const result = {
        magicString: ms,
        replaceOperations,
        liquidContent
    };
    return result;
}
exports.default = liquivelteImportProcessor;
//# sourceMappingURL=liquivelte-import.js.map