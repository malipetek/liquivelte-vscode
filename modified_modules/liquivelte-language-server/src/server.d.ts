import { Connection } from 'vscode-languageserver';
export interface LSOptions {
    /**
     * If you have a connection already that the ls should use, pass it in.
     * Else the connection will be created from `process`.
     */
    connection?: Connection;
    /**
     * If you want only errors getting logged.
     * Defaults to false.
     */
    logErrorsOnly?: boolean;
}
/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
export declare function startServer(options?: LSOptions): void;
