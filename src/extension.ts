// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { decode } from 'sourcemap-codec';
import liquifyTransformer from './preprocess/preprocessor';
import { ReplaceOperation } from './types/replace-operation';
const sourceMaps: object = {};
import * as LanguageServer from './languageserver/src/extension';

const openPreviews: {
	[key: string]: ReplaceOperation[];
} = {};

let timeout: NodeJS.Timer | undefined = undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate (context: vscode.ExtensionContext)
{
	const subscriptions = context.subscriptions;

	LanguageServer.activate(context);

	const liquivelteScheme = 'liquivelte';
	const liquivelteProvider = new class implements vscode.TextDocumentContentProvider
	{

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		async provideTextDocumentContent (uri: vscode.Uri): Promise<string>
		{
			// simply invoke cowsay, use uri-path as text
			try {
				const actualUri = vscode.Uri.parse(uri.fsPath);
				const file = await vscode.workspace.fs.readFile(actualUri);
				const text = file.toString();
				const { content, map, replaceOperations } = await liquifyTransformer(text);

				openPreviews[uri.fsPath] = replaceOperations;
				// sourceMaps[actualUri] = map.generateDecodedMap();

				return content;
			} catch (e) {
				throw e;
			}
		}
	};
	subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(liquivelteScheme, liquivelteProvider));

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "liquivelte" is now active!');

	vscode.window.onDidChangeVisibleTextEditors(editors =>
	{
		// reset open previews
		// Object.keys(openPreviews).forEach(key =>
		// {
		// 	openPreviews[key] = [];
		// });
		// set open previews
		editors.forEach(editor =>
		{
			if (editor.document.uri.scheme === 'liquivelte') {

			}
		});

		console.log('editors ', editors);
		if (editors.length > 0) {
			for (let editor of editors) {
				console.log('uri: ', editor.document.uri);
			}
		}
	});
	vscode.window.onDidChangeActiveTextEditor(function (textEditor: vscode.TextEditor | undefined)
	{
		// console.log('visible text editor has changed: ', textEditor);
		if (textEditor?.document?.fileName.match(/\.liquivelte$/i)) {
			if (!openPreviews[textEditor.document.fileName]) {
				vscode.commands.executeCommand('liquivelte.openPreview');
			} else {
				// preview is already open
			}
			console.log('openPreviews ', openPreviews);
		}
	});

	subscriptions.push(vscode.commands.registerCommand('liquivelte.openPreview', async (_uri: vscode.TextEditor) =>
	{
		let editor = _uri;
		if (!(editor instanceof vscode.Uri)) {
			if (vscode.window.activeTextEditor) {
				// we are relaxed and don't check for markdown files
				editor = vscode.window.activeTextEditor;
			}
		}

		// check if there is no selection
		if (editor.selection.isEmpty) {
			// the Position object gives you the line and character where the cursor is
			const position = editor.selection.active;
		}

		const uri = vscode.Uri.parse('liquivelte:' + editor.document.uri.path);
		const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
		const openEditor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two });

		const deco = vscode.window.createTextEditorDecorationType({
			isWholeLine: false,
			backgroundColor: 'rgba(60, 255, 0, 0.06)'
		});

		const activeDeco = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			border: "1px solid #34b46e9c",
			borderSpacing: "5px",
			borderRadius: "3px"
		});

		triggerUpdateDecorations(openPreviews[editor.document.fileName]);

		let decoRanges: vscode.DecorationOptions[] = [];

		function updateDecorations (operations: ReplaceOperation[])
		{

			const decorations = operations.filter(op => !op.active).map((operation: ReplaceOperation) =>
			{
				const position1 = new vscode.Position(operation.was.lines[0] - 1, operation.was.start);
				const position2 = new vscode.Position(operation.was.lines[operation.was.lines.length - 1] - 1, operation.was.end);
				return {
					range: new vscode.Range(position1, position2),
					renderOptions: {
						// after: { contentText: `  ${operation.explanation}` }
					},
					hoverMessage: `  ${operation.explanation}`
				};
			});

			const activeDecorations = operations.filter(op => op.active).map((operation: ReplaceOperation) =>
			{
				const position1 = new vscode.Position(operation.operation.lines[0] - 1, operation.operation.start);
				const position2 = new vscode.Position(operation.operation.lines[operation.operation.lines.length - 1] - 1, operation.operation.end);
				return {
					range: new vscode.Range(position1, position2),
					renderOptions: {
						after: { contentText: `  ${operation.explanation}` }
					},
					hoverMessage: `  ${operation.explanation}`
				};
			});

			editor.setDecorations(deco, decorations);
			openEditor.setDecorations(activeDeco, activeDecorations);
		}

		function triggerUpdateDecorations (operations: ReplaceOperation[], activeOperations: ReplaceOperation[] = [])
		{
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			openEditor.setDecorations(deco, []);
			openEditor.setDecorations(activeDeco, []);

			timeout = setTimeout(() => updateDecorations(operations), 500);
		}

		vscode.window.onDidChangeTextEditorSelection(function (event: vscode.TextEditorSelectionChangeEvent)
		{
			const [selection] = event.selections;
			const filePath = event.textEditor.document.uri.path;
			const replaceOperations = openPreviews[filePath];

			if (selection.isSingleLine) {
				const { line, character } = selection.start;
				const { line: endLine, character: endCharacter } = selection.end;

				console.log('line in editor ', line, 'endline ', endLine);
				// TODO: selection lines are not matching
				const currentOperation = replaceOperations.find(op => op.was.lines.filter(l => l === line + 1).length > 0);

				// openEditor.setDecorations(vscode.window.createTextEditorDecorationType({}), []);

				if (currentOperation) {
					replaceOperations.forEach(op => op.active = false);
					currentOperation.active = true;
					triggerUpdateDecorations(replaceOperations);
				}
				// decoType.dispose();

				// decoType = vscode.window.createTextEditorDecorationType({
				// 	backgroundColor: 'green',
				// 	color: 'black',
				// 	isWholeLine: true,
				// 	after: {
				// 		contentText: ' x',
				// 		color: 'black'
				// 	}
				// });

				// openEditor.setDecorations(decoType, [new vscode.Range(new vscode.Position(line, character), new vscode.Position(line, character))]);

				const startPos = new vscode.Position(line, character);
				const endPos = new vscode.Position(endLine, endCharacter);
				//openEditor.selection = new vscode.Selection(startPos, endPos);
				openEditor.revealRange(new vscode.Range(startPos, endPos), 1);

			}
		});
	}));

}

// this method is called when your extension is deactivated
export function deactivate () { }