import vscode from 'vscode';
let fileWatcher : vscode.FileSystemWatcher | undefined;

export function startWatch ()
{
  fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.liquivelte');

  fileWatcher.onDidChange(async (uri: vscode.Uri) =>
  {
    const liquivelteDocument = vscode.window.visibleTextEditors.find(editor =>
    {
      return editor.document.uri.scheme === 'liquivelte' && editor.document.uri.path === uri.path;
    });

    if (liquivelteDocument) {
      await updateLiquivelteVirtualDocument(liquivelteDocument.document.uri);
    }
  });
}

export function endWatch ()
{
  fileWatcher.dispose();
}