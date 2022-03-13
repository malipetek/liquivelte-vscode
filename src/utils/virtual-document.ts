import vscode from 'vscode';
import { debounce } from "debounce";
import { ReplaceOperation } from '../types/replace-operation';
import liquivelteTransformer from '../preprocess/preprocessor';
import state from './state';
import path from 'path';

const openPreviews: {
	[key: string]: ReplaceOperation[];
} = {};

state.set = { openPreviews: openPreviews };

async function _updateLiquivelteVirtualDocument (uri: vscode.Uri)
{
	await liquivelteProvider.onDidChangeEmitter.fire(uri);
}

export const updateLiquivelteVirtualDocument = debounce(_updateLiquivelteVirtualDocument, 500);
export const liquivelteProvider = new class implements vscode.TextDocumentContentProvider
{
	// emitter and its event
	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	onDidChange = this.onDidChangeEmitter.event;

	async provideTextDocumentContent (uri: vscode.Uri): Promise<string>
	{
		try {
			const editorOfFile = vscode.window.visibleTextEditors.find(editor =>
			{
				return editor.document.uri.scheme === 'file' && editor.document.uri.fsPath === uri.fsPath;  
			});
			const actualUri = vscode.Uri.parse(uri.fsPath);
			const file = await vscode.workspace.fs.readFile(actualUri);
			const text = editorOfFile ? editorOfFile.document.getText() : file.toString();
			const { content, map, replaceOperations } = await liquivelteTransformer(text, actualUri);
      const parsedPath = path.parse(actualUri.fsPath);
      
      // await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'src', '.svelte'));
			// await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'src', '.svelte', `${parsedPath.name}.liquivelte`), Buffer.from(content));
      state['openPreviews'][uri.fsPath] = replaceOperations;

			return content;
		} catch (e) {
			throw e;
		}
	}
};