export declare class Logger {
    private static logErrorsOnly;
    static setLogErrorsOnly(logErrorsOnly: boolean): void;
    static log(...args: any): void;
    static error(...args: any): void;
}
