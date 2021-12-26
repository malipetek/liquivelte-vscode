import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
declare type DidChangeHandler = (para: DidChangeWatchedFilesParams) => void;
export declare class FallbackWatcher {
    private readonly watcher;
    private readonly callbacks;
    private undeliveredFileEvents;
    constructor(glob: string, workspacePaths: string[]);
    private convert;
    private onFSEvent;
    private readonly scheduleTrigger;
    onDidChangeWatchedFiles(callback: DidChangeHandler): void;
    dispose(): void;
}
export {};
