"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsOrTsComponentInfoProvider = void 0;
const typescript_1 = require("typescript");
const utils_1 = require("../../utils");
const utils_2 = require("./features/utils");
class JsOrTsComponentInfoProvider {
    constructor(typeChecker, classType) {
        this.typeChecker = typeChecker;
        this.classType = classType;
    }
    getEvents() {
        const eventType = this.getType('$$events_def');
        if (!eventType) {
            return [];
        }
        return this.mapPropertiesOfType(eventType);
    }
    getSlotLets(slot = 'default') {
        const slotType = this.getType('$$slot_def');
        if (!slotType) {
            return [];
        }
        const slotLets = slotType.getProperties().find((prop) => prop.name === slot);
        if (!(slotLets === null || slotLets === void 0 ? void 0 : slotLets.valueDeclaration)) {
            return [];
        }
        const slotLetsType = this.typeChecker.getTypeOfSymbolAtLocation(slotLets, slotLets.valueDeclaration);
        return this.mapPropertiesOfType(slotLetsType);
    }
    getType(classProperty) {
        const symbol = this.classType.getProperty(classProperty);
        if (!(symbol === null || symbol === void 0 ? void 0 : symbol.valueDeclaration)) {
            return null;
        }
        return this.typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    }
    mapPropertiesOfType(type) {
        return type
            .getProperties()
            .map((prop) => {
            var _a, _b;
            // type would still be correct when there're multiple declarations
            const declaration = (_a = prop.valueDeclaration) !== null && _a !== void 0 ? _a : (_b = prop.declarations) === null || _b === void 0 ? void 0 : _b[0];
            if (!declaration) {
                return;
            }
            return {
                name: prop.name,
                type: this.typeChecker.typeToString(this.typeChecker.getTypeOfSymbolAtLocation(prop, declaration)),
                doc: typescript_1.default.displayPartsToString(prop.getDocumentationComment(this.typeChecker))
            };
        })
            .filter(utils_1.isNotNullOrUndefined);
    }
    /**
     * The result of this shouldn't be cached as it could lead to memory leaks. The type checker
     * could become old and then multiple versions of it could exist.
     */
    static create(lang, def) {
        const program = lang.getProgram();
        const sourceFile = program === null || program === void 0 ? void 0 : program.getSourceFile(def.fileName);
        if (!program || !sourceFile) {
            return null;
        }
        const defClass = utils_2.findContainingNode(sourceFile, def.textSpan, typescript_1.default.isClassDeclaration);
        if (!defClass) {
            return null;
        }
        const typeChecker = program.getTypeChecker();
        const classType = typeChecker.getTypeAtLocation(defClass);
        if (!classType) {
            return null;
        }
        return new JsOrTsComponentInfoProvider(typeChecker, classType);
    }
}
exports.JsOrTsComponentInfoProvider = JsOrTsComponentInfoProvider;
//# sourceMappingURL=ComponentInfoProvider.js.map