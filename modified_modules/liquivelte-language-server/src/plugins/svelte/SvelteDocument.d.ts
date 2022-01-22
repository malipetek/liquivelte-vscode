import type { compile } from 'svelte/compiler';
import { CompileOptions } from 'svelte/types/compiler/interfaces';
import { PreprocessorGroup, Processed } from 'svelte/types/compiler/preprocess/types';
import { Position } from 'vscode-languageserver';
import { Document, DocumentMapper, SourceMapDocumentMapper, TagInformation } from '../../lib/documents';
import { SvelteConfig } from '../../lib/documents/configLoader';
export declare type SvelteCompileResult = ReturnType<typeof compile>;
export declare enum TranspileErrorSource {
    Script = "Script",
    Style = "Style"
}
declare type PositionMapper = Pick<DocumentMapper, 'getGeneratedPosition' | 'getOriginalPosition'>;
/**
 * Represents a text document that contains a svelte component.
 */
export declare class SvelteDocument {
    private parent;
    private transpiledDoc;
    private compileResult;
    script: TagInformation | null;
    moduleScript: TagInformation | null;
    style: TagInformation | null;
    languageId: string;
    version: number;
    uri: string;
    get config(): Promise<SvelteConfig | undefined>;
    constructor(parent: Document);
    getText(): string;
    getFilePath(): string;
    offsetAt(position: Position): number;
    getTranspiled(): Promise<ITranspiledSvelteDocument>;
    getCompiled(): Promise<SvelteCompileResult>;
    getCompiledWith(options?: CompileOptions): Promise<SvelteCompileResult>;
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroyTranspiled(): void;
}
export interface ITranspiledSvelteDocument extends PositionMapper {
    getText(): string;
    destroy(): void;
}
export declare class TranspiledSvelteDocument implements ITranspiledSvelteDocument {
    private code;
    private mapper?;
    static create(document: Document, config: SvelteConfig | undefined): Promise<TranspiledSvelteDocument>;
    constructor(code: string, mapper?: SourceMapDocumentMapper | undefined);
    getOriginalPosition(generatedPosition: Position): Position;
    getText(): string;
    getGeneratedPosition(originalPosition: Position): Position;
    destroy(): void;
}
/**
 * Only used when the user has an old Svelte version installed where source map support
 * for preprocessors is not built in yet.
 * This fallback version does not map correctly when there's both a module and instance script.
 * It isn't worth fixing these cases though now that Svelte ships a preprocessor with source maps.
 */
export declare class FallbackTranspiledSvelteDocument implements ITranspiledSvelteDocument {
    private parent;
    private transpiled;
    scriptMapper: SvelteFragmentMapper | null;
    styleMapper: SvelteFragmentMapper | null;
    static create(document: Document, preprocessors?: PreprocessorGroup | PreprocessorGroup[]): Promise<FallbackTranspiledSvelteDocument>;
    private fragmentInfos;
    private constructor();
    getOriginalPosition(generatedPosition: Position): Position;
    getURL(): string;
    getText(): string;
    getGeneratedPosition(originalPosition: Position): Position;
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroy(): void;
}
export declare class SvelteFragmentMapper implements PositionMapper {
    /**
     * End offset + length difference to original
     */
    fragmentInfo: {
        end: number;
        diff: number;
    };
    /**
     * Maps between full original source and fragment within that original.
     */
    private originalFragmentMapper;
    /**
     * Maps between full transpiled source and fragment within that transpiled.
     */
    private transpiledFragmentMapper;
    /**
     * Maps between original and transpiled, within fragment.
     */
    private sourceMapper;
    static createStyle(originalDoc: Document, transpiled: string, processed: Processed[]): Promise<SvelteFragmentMapper | null>;
    static createScript(originalDoc: Document, transpiled: string, processed: Processed[]): Promise<SvelteFragmentMapper | null>;
    private static create;
    private static createSourceMapper;
    private constructor();
    isInTranspiledFragment(generatedPosition: Position): boolean;
    getOriginalPosition(generatedPosition: Position): Position;
    /**
     * Reversing `getOriginalPosition`
     */
    getGeneratedPosition(originalPosition: Position): Position;
    /**
     * Needs to be called before cleanup to prevent source map memory leaks.
     */
    destroy(): void;
}
export {};
