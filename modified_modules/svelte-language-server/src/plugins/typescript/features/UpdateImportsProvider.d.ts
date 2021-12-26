import { WorkspaceEdit } from 'vscode-languageserver';
import { FileRename, UpdateImportsProvider } from '../../interfaces';
import { LSAndTSDocResolver } from '../LSAndTSDocResolver';
export declare class UpdateImportsProviderImpl implements UpdateImportsProvider {
    private readonly lsAndTsDocResolver;
    constructor(lsAndTsDocResolver: LSAndTSDocResolver);
    updateImports(fileRename: FileRename): Promise<WorkspaceEdit | null>;
    private getLSForPath;
}
