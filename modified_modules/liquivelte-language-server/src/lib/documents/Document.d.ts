import { WritableDocument } from './DocumentBase';
import { TagInformation } from './utils';
import { SvelteConfig } from './configLoader';
import { HTMLDocument } from 'vscode-html-languageservice';
/**
 * Represents a text document contains a svelte component.
 */
export declare class Document extends WritableDocument {
    url: string;
    content: string;
    languageId: string;
    scriptInfo: TagInformation | null;
    moduleScriptInfo: TagInformation | null;
    styleInfo: TagInformation | null;
    templateInfo: TagInformation | null;
    configPromise: Promise<SvelteConfig | undefined>;
    config?: SvelteConfig;
    html: HTMLDocument;
    constructor(url: string, content: string);
    private updateDocInfo;
    /**
     * Get text content
     */
    getText(): string;
    /**
     * Set text content and increase the document version
     */
    setText(text: string): void;
    /**
     * Returns the file path if the url scheme is file
     */
    getFilePath(): string | null;
    /**
     * Get URL file path.
     */
    getURL(): string;
    /**
     * Returns the language associated to script, style or template.
     * Returns an empty string if there's nothing set.
     */
    getLanguageAttribute(tag: 'script' | 'style' | 'template'): string;
    private addDefaultLanguage;
}
