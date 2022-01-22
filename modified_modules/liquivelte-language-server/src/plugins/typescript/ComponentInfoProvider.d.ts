import { ComponentEvents } from 'svelte2tsx';
import ts from 'typescript';
export declare type ComponentPartInfo = ReturnType<ComponentEvents['getAll']>;
export interface ComponentInfoProvider {
    getEvents(): ComponentPartInfo;
    getSlotLets(slot?: string): ComponentPartInfo;
}
export declare class JsOrTsComponentInfoProvider implements ComponentInfoProvider {
    private readonly typeChecker;
    private readonly classType;
    private constructor();
    getEvents(): ComponentPartInfo;
    getSlotLets(slot?: string): ComponentPartInfo;
    private getType;
    private mapPropertiesOfType;
    /**
     * The result of this shouldn't be cached as it could lead to memory leaks. The type checker
     * could become old and then multiple versions of it could exist.
     */
    static create(lang: ts.LanguageService, def: ts.DefinitionInfo): ComponentInfoProvider | null;
}
