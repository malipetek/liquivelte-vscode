import vscode from 'vscode';
import state from './state';

function handleSchema (a, content, offset)
		{
			try {
				const schema = JSON.parse(content);
				state['sidebar'].webview.postMessage({
					type: "schema-changed",
					data: schema
				});
			} catch (err) {
				// 
				const offset = parseInt(err.message.match(/position\s+(\d+)/)[1], 10);
				const linesUntilError = content.slice(0, offset + 1).split('\n');
				const errorLine = linesUntilError.length;
				const contentLines = content.split('\n');
				const lineOffset = linesUntilError[linesUntilError.length - 1].length - 1;
				const message = contentLines.slice(0, errorLine).join('\n') +
					'\n' + new Array(lineOffset).fill(' ').join('') +
					'👆\n' + contentLines.slice(errorLine).join('\n');
				state['sidebar'].webview.postMessage({
					type: "schema-error",
					data: { message: err.message, content: message }
				});
				state['sidebar'].webview.postMessage({
					type: "schema-changed",
					data: false
				});
			}
			
			return '';
}
			
export async function fileChangeHandler (uriOrDocument: vscode.Uri | vscode.TextDocument)
{
	let fileContent = '';
	let fileExtension = '';
	let isSchemaJSON = false;
	if (uriOrDocument instanceof vscode.Uri) {
		fileExtension = uriOrDocument.fsPath.match(/\.[^\.]+$/i)[0];
		isSchemaJSON = uriOrDocument.fsPath.slice(-11) == 'schema.json';
		fileContent = (await vscode.workspace.fs.readFile(uriOrDocument)).toString();
	} else {
		fileExtension = uriOrDocument.fileName.match(/\.[^\.]+$/i)[0];
		isSchemaJSON = uriOrDocument.fileName.slice(-11) == 'schema.json';
		fileContent = await uriOrDocument.getText();
	}

	if (/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim.test(fileContent)) {
			fileContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, handleSchema);
	} else if (isSchemaJSON) {
		handleSchema(null, fileContent, null);
	} else {
		state['sidebar'].webview.postMessage({
			type: "schema-changed",
			data: false
		});
	}
}

export async function activeFileChangeHandler (editor: vscode.TextEditor)
{
	if (editor && state['sidebar'].webview) {
		state['sidebar'].webview.postMessage({
			type: "active-file-changed",
			data: editor.document.uri.fsPath
		});

		const fileExtention = (editor.document.fileName.match(/\.[^\.]+$/i) || [])[0];

		if (fileExtention === '.liquivelte' || fileExtention === '.liquid' || fileExtention === '.json') {
			await fileChangeHandler(editor.document);
		} else {
			state['sidebar'].webview.postMessage({
				type: "schema-changed",
				data: false
			});
		}
	}
}