import * as vscode from 'vscode';
import { decode } from 'sourcemap-codec';
import liquivelteTransformer from './preprocess/preprocessor';
import * as LanguageServer from './languageserver/src/extension';
import { generateAllScripts } from './generate-theme/process-theme';
import { SidebarProvider } from "./sidebar/sidebar-provider";
import { updateLiquivelteVirtualDocument, liquivelteProvider } from './utils/virtual-document';
import { triggerUpdateDecorations } from './utils/decorations';
import { activeFileChangeHandler, fileChangeHandler } from './utils/state-change-handlers';
import state from './utils/state';

state.set = {
	openEditor: vscode.window.activeTextEditor,
	openPreview: '',
	sidebar: '',
	buildErrors: [],
	buildWarnings: [],
	buildConfig: {},
	criticalConfig: {}
};

export async function activate (context: vscode.ExtensionContext)
{
	const subscriptions = context.subscriptions;

	LanguageServer.activate(context);

	const liquivelteScheme = 'liquivelte';

	subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(liquivelteScheme, liquivelteProvider));

	console.log('"liquivelte" is activated.');

	const sidebarProvider = new SidebarProvider(context.extensionUri);

  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  item.text = "Liquivelte Preview";
  item.command = "liquivelte.openPreview";
  item.show();

	const criticalConfigPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'src', '.config',  'critical.json');
	try {
		const criticalConfigFile = await vscode.workspace.fs.readFile(criticalConfigPath);
		state.criticalConfig = JSON.parse(criticalConfigFile.toString());
	} catch (err) {

	}
	
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("liquivelte-sidebar", sidebarProvider)
	);

	state.watch['openEditor'] = activeFileChangeHandler;

	state.watch['buildWarnings'] = (warnings: any) =>
	{
		if(state['sidebar'].webview) {
			state['sidebar'].webview.postMessage({
				type: "build-warnings",
				data: warnings
			});
		}
	};
	state.watch['buildErrors'] = (errors: any) =>
	{
		if(state['sidebar'].webview) {
			state['sidebar'].webview.postMessage({
				type: "build-errors",
				data: errors
			});
		}
	};
	state.once['sidebar'] = (sidebar: vscode.WebviewView) =>
	{
		state.until['templates'] = (templates) =>
		{
			if (!state['sidebar'] || !templates) return;
			Object.keys(templates).forEach((template) =>
			{
				state.until[template] = (value) =>
					{
						if (!state['sidebar']) return false;
						sidebar.webview.postMessage({
							type: "building-state",
							data: {
								template,
								...value
							}
						});
					};
			});
					
			sidebar.onDidDispose(e =>
			{
				state['sidebar'] = null;
			});
		}
	};

	state.watch.criticalConfig = async (config) =>
	{
		if (Object.keys(config || {}).length) {
			await vscode.workspace.fs.writeFile(criticalConfigPath, Buffer.from(JSON.stringify(config, null, 2)));
		}
	};
	
	vscode.window.onDidChangeActiveTextEditor(async function (textEditor: vscode.TextEditor | undefined)
	{
		state['openEditor'] = textEditor;
		state['openPreview'] = null;
	});

	subscriptions.push(vscode.commands.registerCommand('liquivelte.openPreview', async (_uri: vscode.TextEditor) =>
	{
		let editor = _uri;
		if (!(editor instanceof vscode.Uri)) {
			if (vscode.window.activeTextEditor) {
				editor = vscode.window.activeTextEditor;
			}
		}

		const uri = vscode.Uri.parse('liquivelte:' + editor.document.uri.path);
		const doc = await vscode.workspace.openTextDocument(uri);
		state['openPreview'] = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two });

		triggerUpdateDecorations(state['openPreviews'][editor.document.fileName]);

		vscode.window.onDidChangeTextEditorSelection(async function (event: vscode.TextEditorSelectionChangeEvent)
		{
			const [selection] = event.selections;
			const filePath = event.textEditor.document.uri.path;

			const liquivelteDocument = vscode.window.visibleTextEditors.find(editor =>
			{
				return editor.document.uri.scheme === 'liquivelte' && editor.document.uri.path === event.textEditor.document.uri.path;
			});

			if (liquivelteDocument) {
				await updateLiquivelteVirtualDocument(liquivelteDocument.document.uri);
			}

			const replaceOperations = state['openPreviews'][filePath];

			if (selection.isSingleLine) {
				const { line, character } = selection.start;
				const { line: endLine, character: endCharacter } = selection.end;

				const currentOperation = replaceOperations && replaceOperations.length ? replaceOperations.find(op => op.was.lines.filter(l => l === line + 1).length > 0) : undefined;
			}
		});
	}));
}

export function deactivate () { }
