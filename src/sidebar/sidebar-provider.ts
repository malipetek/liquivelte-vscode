import * as vscode from "vscode";
import getNonce from "../utils/get-nonce";
export const apiBaseUrl = "http://localhost:3002";
import getThemeDirectory from "../utils/get-theme-directory";
import { generateAllScripts } from '../generate-theme/process-theme';
import { activeFileChangeHandler } from '../utils/state-change-handlers';
import { startWatch, endWatch } from "../utils/watcher";
import debounce from 'debounce-async';
export const sendStatsDebounced = debounce(sendStats, 1000);
import { exec } from "child_process";
import state from "../utils/state";
import clearSchema from "../utils/clear-schema";
import generateCritical from "../utils/generate-critical";

function execAsync (cmd)
{
  return new Promise((res, rej) =>
  {
    let stdOut = '';
    let stdErr = '';
    const proc = exec(cmd, (err, stdout, stderr) =>
    {
      stdOut += stdout;
      stdErr += stderr;
      if (err) {
        rej(err);
      }
    });
    // resolve upon process end
    proc.on('close', () =>
    {
      res(stdOut);
    });
  });
}
function tryJSONParse (str: string)
{
  let parsed = {};
  try {
    parsed = JSON.parse(str);
  } catch (err) {
    parsed = {
      error: 'error parsing json',
      message: err.message
    };
  }
  return parsed;
}
export async function sendStats ()
{
  const templates_cache = { ...state.templates };
  const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder, templates, layouts } = await getThemeDirectory();
  for (let temp in templates) {
    templates[temp].loading = templates_cache[temp]?.loading;
  }
  if (state['sidebar'].webview) {
    state['sidebar'].webview.postMessage({
      type: "stats",
      stats: {
        srcFolder,
        presetsSame,
        validTheme: isTheme,
        themeFolder: themeDirectory,
        templates,
        layouts,
        configFile,
        data: state.data,
        watching: state['watching'],
        buildConfig: state['buildConfig'],
      },
      criticalConfig: state.criticalConfig
    });

    state['sidebar'].webview.postMessage({
      type: "build-warnings",
      data: state['buildWarnings']
    });

    state['sidebar'].webview.postMessage({
      type: "build-errors",
      data: state['buildErrors']
    });

    if (state['openEditor'] && state['sidebar'].webview) {
      activeFileChangeHandler(state['openEditor']);
    }
  }

}

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView (webviewView: vscode.WebviewView)
  {
    if (!this._view) {
      this._view = webviewView;
      state['sidebar'] = webviewView;

      webviewView.webview.options = {
        // Allow scripts in the webview
        enableScripts: true,

        localResourceRoots: [this._extensionUri],

      };

      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      
      
      webviewView.webview.onDidReceiveMessage(async (data) =>
      {
        
        switch (data.type) {
          case "get-stats": {
            await sendStats();
            break;
          }
          case 'get-translations': {
            const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder } = await getThemeDirectory();
            if (!isTheme) return;
            const localeFolders = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales'));
            
            const sectionTranslations = {};
            const translations = {};
            await Promise.all(localeFolders.map(async file_or_folder =>
            {
              const [name, type] = file_or_folder;
              const [countrycode, default_or_schema_or_json, schema_or_json] = name.split('.');
              
              
              if (default_or_schema_or_json === 'json') {
                // regular locale file  
                translations[countrycode] = tryJSONParse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', name))).toString());
              } else if (default_or_schema_or_json === 'schema') {
                // section locale file
                sectionTranslations[countrycode] = tryJSONParse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', name))).toString());
              } else if (default_or_schema_or_json === 'default') {
                // default file
                if (schema_or_json === 'json') {
                  // default regular locale file
                  translations[countrycode] = tryJSONParse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', name))).toString());
                } else if (schema_or_json === 'schema') {
                  // default section locale file
                  sectionTranslations[countrycode] = tryJSONParse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', name))).toString());
                }
              }
            }));
            webviewView.webview.postMessage({
              type: "translations",
              translations,
              sectionTranslations
            });
            break;
          }
          case 'regenerate-theme': {
            await generateAllScripts();
            break;
          }
          case "save-schema": {
            const currentFile = await vscode.workspace.fs.readFile(vscode.Uri.parse(data.file));
            const content = currentFile.toString();
            const isJSonSchema = data.file.slice(-11) === 'schema.json';

            clearSchema(data.schema);
            const schemaStringified = JSON.stringify(data.schema, null, 2);
            
            const newContent = isJSonSchema ? schemaStringified : content.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) =>
            {
              return `{% schema %}\n${schemaStringified}\n{% endschema %}`;
            });

            await vscode.workspace.fs.writeFile(vscode.Uri.parse(data.file), Buffer.from(newContent));

            break;
          }
          case "save-translations": {
            const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder } = await getThemeDirectory();
            
            await Promise.all(Object.keys(data.sectionTranslations).map(async (locale) =>
            {
              const localeFile = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', `${locale}${locale === 'en' ? '.default' : ''}.schema.json`));
              const localeFileContent = localeFile.toString();
              if (localeFileContent !== JSON.stringify(data.sectionTranslations[locale], null, 2)) {
                await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', `${locale}${locale === 'en' ? '.default' : ''}.schema.json`), Buffer.from(JSON.stringify(data.sectionTranslations[locale], null, 2)));
              }
            }));
            break;
          }
          case "start-watch": {
            startWatch();
            break;
          }
          case "end-watch": { 
              endWatch();
            break;
          }
          case 'open-folder': {
            const uri = vscode.Uri.parse(data.link);
            vscode.commands.executeCommand('workbench.files.action.collapseExplorerFolders');
            setTimeout(() =>
            {
              vscode.commands.executeCommand('revealInExplorer', uri);
              vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
            }, 200);
            // vscode.commands.executeCommand('workbench.explorer.fileView.focus');
            break;
            }
          case 'open-file': {
            // const uri = vscode.Uri.parse(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.link).path);
            const _uri = vscode.Uri.parse(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.link).fsPath);
            let [uristr, line] = _uri.fsPath.split('#');
            const uri = vscode.Uri.parse(uristr);

            const editor = await vscode.window.showTextDocument(uri);
            editor.revealRange(new vscode.Range(+line, 0, +line, 0), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            break;
          }
            
          case 'set-build-config': {
            state['buildConfig'] = data.buildConfig;
            break;
          }
          case 'critical-config': {
            state.criticalConfig = data.value;
            break;
          }
          case 'gen-critical': {
            webviewView.webview.postMessage({
              type: "critical-result",
              result: 'loading'
            });
            const result = await generateCritical();
            webviewView.webview.postMessage({
              type: "critical-result",
              result
            });
            break;
          }
          case 'create-folder': {
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.folder));
            break;
          }
          case 'create-file': {
            const { themeDirectory } = await getThemeDirectory();
            if (data.file === 'config.yml') {
              await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.file),
              Buffer.from(`development:
              password: [shptka_...]
              theme_id: "[theme_id]"
              store: liquivelte.myshopify.com
              directory: ${themeDirectory || '.'}`));
            }
            if (data.file === 'src/liquivelte-liquid.js') {
              const liquivelteFile = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.Uri.parse(__dirname), '..', '..', '..', 'media', 'liquivelte-liquid.js'));
              await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.file),
              liquivelteFile);
              
            }
            
            if (data.file === 'src/sections/example-product.liquivelte') { 
              const exampleFile = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.Uri.parse(__dirname), '..', '..', '..', 'media', 'example.liquivelte'));
              await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.file), exampleFile);
            }
            break;
          }
          case 'clone-theme': {
            const terminal = vscode.window.createTerminal({});
            terminal.sendText(`git clone https://github.com/malipetek/liquivelte-theme.git theme`);
            terminal.show();
            break;
          }
        }
      });
    }
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "src", "webviews", "sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "src", "webviews", "sidebar.css")
    );
    const iconMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "icon.css")
    );
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
          webview.cspSource
        }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <link href="${iconMainUri}" rel="stylesheet">
        <style>
        .md .theme-dark, .md.theme-dark {
          background-color: transparent !important;
        }
        .vscode-dark .page {
          background-color: transparent !important;
        }
        .vscode-dark .list ul{
          background-color: transparent !important;
        }
          </style>
        <script nonce="${nonce}">
          const apiBaseUrl = ${JSON.stringify(apiBaseUrl)}
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
