import * as vscode from 'vscode';
export default function liquivelteTransformer(documentContent: string, fileUri: vscode.Uri): Promise<{
    content: string;
    map: any;
    replaceOperations: any;
    liquidImportsModule: any;
    subImportsRegistryModule: any;
    exportedObjectVariables: any;
    exportedVariables: any;
    liquidContent: string;
}>;
