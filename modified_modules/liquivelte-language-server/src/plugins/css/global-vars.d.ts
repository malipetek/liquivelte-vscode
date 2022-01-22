export interface GlobalVar {
    name: string;
    filename: string;
    value: string;
}
export declare class GlobalVars {
    private fsWatcher?;
    private globalVars;
    watchFiles(filesToWatch: string): void;
    private updateForFile;
    getGlobalVars(): GlobalVar[];
}
