"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageService = exports.getLanguage = void 0;
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const svelte_selectors_1 = require("./features/svelte-selectors");
const customDataProvider = {
    providePseudoClasses() {
        return svelte_selectors_1.pesudoClass;
    },
    provideProperties() {
        return [
            {
                name: 'vector-effect',
                values: [{ name: 'non-scaling-stroke' }, { name: 'none' }],
                status: 'experimental'
            }
        ];
    },
    provideAtDirectives() {
        return [];
    },
    providePseudoElements() {
        return [];
    }
};
const [css, scss, less] = [
    vscode_css_languageservice_1.getCSSLanguageService,
    vscode_css_languageservice_1.getSCSSLanguageService,
    vscode_css_languageservice_1.getLESSLanguageService
].map((getService) => getService({
    customDataProviders: [customDataProvider]
}));
const langs = {
    css,
    scss,
    less
};
function getLanguage(kind) {
    switch (kind) {
        case 'scss':
        case 'text/scss':
            return 'scss';
        case 'less':
        case 'text/less':
            return 'less';
        case 'css':
        case 'text/css':
        default:
            return 'css';
    }
}
exports.getLanguage = getLanguage;
function getLanguageService(kind) {
    const lang = getLanguage(kind);
    return langs[lang];
}
exports.getLanguageService = getLanguageService;
//# sourceMappingURL=service.js.map