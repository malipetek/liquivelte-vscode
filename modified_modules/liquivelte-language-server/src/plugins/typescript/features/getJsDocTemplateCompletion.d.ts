import ts from 'typescript';
import { CompletionList } from 'vscode-languageserver';
import { SvelteSnapshotFragment } from '../DocumentSnapshot';
export declare function getJsDocTemplateCompletion(fragment: SvelteSnapshotFragment, lang: ts.LanguageService, filePath: string, offset: number): CompletionList | null;
