import vscode from 'vscode';
import state from '../utils/state';
import { generateAllScripts, generateTemplateScript } from '../generate-theme/process-theme';
import { fileChangeHandler } from '../utils/state-change-handlers';
import getThemeDirectory from '../utils/get-theme-directory';
import { sendStatsDebounced } from '../sidebar/sidebar-provider';

state.set = { watching: false };
let fileWatcher: vscode.FileSystemWatcher | undefined;
let templatesWatcher: vscode.FileSystemWatcher | undefined;
let layoutsWatcher: vscode.FileSystemWatcher | undefined;

state.until['watching'] = () =>
{
    if (state['sidebar'] && state['sidebar'].webview) {
      state['sidebar'].webview.postMessage({
        type: "watch-state",
        watching: state['watching']
      });
    }
    return state['sidebar'];
};

export async function startWatch ()
{
  console.log("state['deptree']", state['asd']);
  if (!state['deptree'] || Object.keys(state['deptree']).length === 0) {
    /*
    * If there is not dependency tree, we need to run build once to get the dependency tree
    */
    await generateAllScripts();
  }

  const { isTheme, themeDirectory, folders, workspaceFolders } = await getThemeDirectory();
  fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], 'src/**'));
  state['watching'] = true;

  fileWatcher.onDidChange(async (uri: vscode.Uri) =>
  {
    const { isTheme, themeDirectory, folders, workspaceFolders } = await getThemeDirectory();
    const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates');
    const layoutsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout');
    const layouts = (await vscode.workspace.fs.readDirectory(layoutsFolder)).map(file => file[0]);
    // const liquivelteDocument = vscode.window.visibleTextEditors.find(editor => editor.document.uri.scheme === 'liquivelte' && editor.document.uri.path === uri.path);

    // if (liquivelteDocument) {
    //   // await updateLiquivelteVirtualDocument(liquivelteDocument.document.uri);
    // }
    const activeEditorUri = state['openEditor'].document.uri;
    if (activeEditorUri.fsPath === uri.fsPath) {
      await fileChangeHandler(uri);
    }

    if (uri.fsPath.includes('.templates')) return;
    const templatesToRebuild = Object.keys(state['deptree']).map(templateName =>
    {
      const willRebuild = state['deptree'][templateName].some(dependency =>
      {
        return dependency === uri.fsPath;
      });

      return {
        willRebuild,
        templateName
      }
    }).filter(entry => entry.willRebuild);

    console.log('templatesToRebuild', templatesToRebuild);
    await Promise.all(templatesToRebuild.map(async entry =>
    { 
      await generateTemplateScript(entry.templateName, layouts.includes(entry.templateName));
    }));

  });
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
    templatesWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory), 'templates/**'));
    templatesWatcher.onDidChange(async (uri: vscode.Uri) => { await sendStatsDebounced(); });
  }
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
    layoutsWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory), 'layout/**'));
    layoutsWatcher.onDidChange(async (uri: vscode.Uri) => { await sendStatsDebounced(); } );
  }
}

export function endWatch ()
{
  fileWatcher?.dispose();
  templatesWatcher?.dispose();
  layoutsWatcher?.dispose();
  state['watching'] = false;
}