import * as vscode from "vscode";
import getNonce from "../utils/get-nonce";
export const apiBaseUrl = "http://localhost:3002";
import getThemeDirectory from "../utils/get-theme-directory";
import { generateAllScripts } from '../generate-theme/process-theme';
import state from "../utils/state";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      
      switch (data.type) {
        case "get-stats": {
          const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder, templates } = await getThemeDirectory();

          webviewView.webview.postMessage({
            type: "stats",
            stats: {
              srcFolder,
              presetsSame,
              validTheme: isTheme,
              themeFolder: themeDirectory,
              templates,
              configFile,
              data: state.data
            },
          });
          if (templates) {
            Object.keys(templates).forEach((template) =>
            {
              state.watch[template] = (value) =>
              {
                webviewView.webview.postMessage({
                  type: "building-state",
                  data: {
                    template,
                    ...value
                  }
                });
              };
            });
          }

          break;
        }
        case 'regenerate-theme': { 
          const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder } = await getThemeDirectory();

          await generateAllScripts(themeDirectory);
          break;
        }
        case "start-watch": {
            
            break;
          }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
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
    const icoFontMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "material-icons.woff2")
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
        <link rel="preload" href="${icoFontMainUri}" as="font" type="font/woff2" crossorigin>
        <style>
        /* fallback */
        @font-face {
          font-family: 'Material Icons';
          font-style: normal;
          font-weight: 400;
          src: url(${icoFontMainUri}) format('woff2');
        }
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
