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
        const { isTheme, themeDirectory, folders, workspaceFolders, configFile, presetsSame, srcFolder, templates, layouts } = await getThemeDirectory();
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
    });

    state['sidebar'].webview.postMessage({
      type: "build-warnings",
      data: state['buildWarnings']
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
      
      
      webviewView.webview.onDidReceiveMessage(async (data) => {
        
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
              } else if(default_or_schema_or_json === 'default') {
                // default file
                if (schema_or_json === 'json') {
                  // default regular locale file
                  translations[countrycode] = tryJSONParse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeDirectory, 'locales', name))).toString());
                } else if(schema_or_json === 'schema') {
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
            const newContent = content.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim, (a, content, offset) =>
            {
              clearSchema(data.schema);
              const schemaStringified = JSON.stringify(data.schema, null, 2);
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
            const _uri = vscode.Uri.parse(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.link));
            let [uri, line] = _uri.fsPath.split('#');
            uri = vscode.Uri.parse(uri);
            line = +line;
            const editor = await vscode.window.showTextDocument(uri);
            editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            break;
          }
            
          case 'set-build-config': {
            state['buildConfig'] = data.buildConfig;
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
            if (data.file === 'src/liquid.js') {
              await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.file),
                Buffer.from(`
              const num = (n) => {
                if (n.aspect_ratio) {
                    n = n.aspect_ratio;
                }
                return n;
              }
              
              function isValidHttpUrl(string) {
                let url;
                string = string.replace(/^\\/\\//, 'https://');
                try {
                  url = new URL(string);
                } catch (_) {
                  return false;  
                }
              
                return url.protocol === "http:" || url.protocol === "https:";
              }
              function handleize(str) {
                str = str.toLowerCase();
              
                var toReplace = ['"', "'", "\\\\", "(", ")", "[", "]"];
              
                // For the old browsers
                for (var i = 0; i < toReplace.length; ++i) {
                  str = str.replace(toReplace[i], "");
                }
              
                str = str.replace(/\\W+/g, "-");
              
                if (str.charAt(str.length - 1) == "-") {
                  str = str.replace(/-+\\z/, "");
                }
              
                if (str.charAt(0) == "-") {
                  str = str.replace(/\\A-+/, "");
                }
              
                return str;
              };
              
              export default {
                default: (input, fallback) => {
                    let isObject = false;
                    try { isObject = input.constructor === {}.constructor; } catch (err) {}
                    if (input == 'undefined' || input == 'null' || input == '[]' || input == '[Object]') {
                        return fallback || '';
                    } else if (input && (input.length || isObject)) {
                        return input;
                    } else {
                        return fallback || '';
                    }
                },
                append: (input, str) => input + str + "",
                img_url: (input, size) => {
                    // console.log('img url');
                    if (!input) { 
                        return input = \`//cdn.shopify.com/shopifycloud/shopify/assets/no-image-2048-5e88c1b20e087fb7bbe9a3771824e743c244f437e4f8ba93bbf7b11b53f7824c.gif\`;
                    }
                    if (input.src) {
                        input = input.src;
                    }
                    if (input.image) {
                        input = input.image;
                    }
                    if (input.constructor !== String) {
                        return input = \`//cdn.shopify.com/shopifycloud/shopify/assets/no-image-2048-5e88c1b20e087fb7bbe9a3771824e743c244f437e4f8ba93bbf7b11b53f7824c.gif\`;
                    }
                    /* if (/_(lg|md|sm)_/.test(input)) {
                        return input.replace(/_(lg|mg|sm)_/, \`_$1_\${size}_\`);
                    } else if (/_(lg|md|sm)/.test(input)) {
                        return input.replace(/_(lg|mg|sm)/, \`_$1_\${size}\`);
                    } else {
                    } */
                    if(!isValidHttpUrl(input)) {
                        input = \`https://cdn.shopify.com/s/files/1/0621/4444/6683/\${input}\`;
                    }
                    return input.replace(/\\.([^\\.]+)($|\\?)/, \`_\${size}.$1?\`);
                },
                money: (input) => {
                    input = String(input);
                    if (isNaN(parseInt(input))) {
                        return \`$0.00\`;
                    }
                    if (input.length > 2) {
                        return \`$\${((+input.slice(0, -2)).toLocaleString())}.\${input.slice(-2)}\`;
                    } else {
                        return \`$\${input}\`;
                    }
                },
                capitalize: (input) => (input[0].toUpperCase() + input.slice(1)),
                divided_by: (input, n) => (num(input) / num(n)),
                times: (input, n) => (num(input) * num(n)),
                escape: (input) => escape(input),
                replace: (input, rep, tar) => {
                    return input.replace(new RegExp(rep), tar);
                },
                within: (url, collection) => {
                    return \`/collections/\${collection.handle}/\${url}\`
                },
                split: (input, splitter) => input.split(splitter),
                first: (input) => input[0],
                last: (input) => input[input.length - 1],
                link_to_tag: (tag) => {
                    const u = new URL(window.location.href);
                    return \`<a href="\${u.protocol}//\${u.host}\${u.pathname}/\${tag}"> \${tag} </a>\`;
                },
                crop: (input, cropType) => {
                    return input.replace(/\\.([^\\.]+)[$\\?]/, \`_crop_\${cropType}.$1?\`);
                },
                plus: (input) => +input + 1,
                minus: (input) => +input - 1,
                scale: (input, scale) => {
                    return input.replace(/\\.([^\\.]+)[$\\?]/, \`@\${scale}x.$1?\`);
                },
                handleize,
                json: (input) => JSON.stringify(input),
                date: x => x
              }`));
              
            }

            if (data.file === 'src/sections/example-product.liquivelte') { 
              await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.file),
                Buffer.from(`{% liquid 
  assign breadcrumbs1 = request.path | split: '/' 
  for item in breadcrumbs1
    unless item == blank
      assign breadcrumbs = breadcrumbs | append: item
      unless forloop.last
        assign breadcrumbs = breadcrumbs | append: ',' 
      endunless
    endunless
  endfor
  assign breadcrumbs = breadcrumbs | split: ','
  assign breadcrumbs_size = breadcrumbs.size | minus: 1
  assign price_formatted = product.price | money
%}
<script>
  import liquid from '../liquid.js';
  import breadcrumbs from 'theme';
  import breadcrumbs_size from 'theme';
  import price_formatted from 'theme';
  import product from 'theme';

</script>
<style global lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>

<div class="bg-white">
  <div class="pt-6">
    <nav aria-label="Breadcrumb">
      <ol role="list" class="max-w-2xl mx-auto px-4 flex items-center space-x-2 sm:px-6 lg:max-w-7xl lg:px-8">
        {% for item in breadcrumbs %}
          {% unless index == breadcrumbs_size %}
            {% unless item == '' %}
              <li> 
                <div class="flex items-center">
                  <a href="{{- item | prepend: '/' -}}" class="mr-2 text-sm font-medium text-gray-900"> {{- item | capitalize -}} </a>
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="w-4 h-5 text-gray-300">
                    <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                  </svg>
                </div>
              </li>
            {% endunless %}
          {% else %}
          <li class="text-sm">
            <a href="#" aria-current="page" class="font-medium text-gray-500 hover:text-gray-600"> {{- product.title -}}</a>
          </li>
          {% endunless %}
        {% endfor %}
      </ol>
    </nav>

    <!-- Image gallery -->
    <div class="mt-6 max-w-2xl mx-auto sm:px-6 lg:max-w-7xl lg:px-8 lg:grid lg:grid-cols-3 lg:gap-8">
      {% for image in product.images %}
        <div class="aspect-w-4 aspect-h-5 sm:rounded-lg sm:overflow-hidden lg:aspect-w-3 lg:aspect-h-4">
          <img src="{{- image | img_url: '500x' -}}" alt="{{- image.alt -}}" class="w-full h-full object-center object-cover">
        </div>
      {% endfor %}
    </div>

    <!-- Product info -->
    <div class="max-w-2xl mx-auto pt-10 pb-16 px-4 sm:px-6 lg:max-w-7xl lg:pt-16 lg:pb-24 lg:px-8 lg:grid lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8">
      <div class="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{{- product.title -}}</h1>
      </div>

      <!-- Options -->
      <div class="mt-4 lg:mt-0 lg:row-span-3">
        <h2 class="sr-only">Product information</h2>
        <p class="text-3xl text-gray-900">{{- price_formatted -}}</p>

        <!-- Reviews -->
        <div class="mt-6">
          <h3 class="sr-only">Reviews</h3>
          <div class="flex items-center">
            <div class="flex items-center">
              <!--
                Heroicon name: solid/star

                Active: "text-gray-900", Default: "text-gray-200"
              -->
              <svg class="text-gray-900 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <!-- Heroicon name: solid/star -->
              <svg class="text-gray-900 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <!-- Heroicon name: solid/star -->
              <svg class="text-gray-900 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <!-- Heroicon name: solid/star -->
              <svg class="text-gray-900 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <!-- Heroicon name: solid/star -->
              <svg class="text-gray-200 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p class="sr-only">4 out of 5 stars</p>
            <a href="#" class="ml-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">117 reviews</a>
          </div>
        </div>

        <form type="product" prop="product" class="mt-10">
          <!-- Colors -->
          <div>
            <h3 class="text-sm text-gray-900 font-medium">Color</h3>

            <fieldset class="mt-4">
              <legend class="sr-only">Choose a color</legend>
              <div class="flex items-center space-x-3">
                <!--
                  Active and Checked: "ring ring-offset-1"
                  Not Active and Checked: "ring-2"
                -->
                <label class="-m-0.5 relative p-0.5 rounded-full flex items-center justify-center cursor-pointer focus:outline-none ring-gray-400">
                  <input type="radio" name="color-choice" value="White" class="sr-only" aria-labelledby="color-choice-0-label">
                  <p id="color-choice-0-label" class="sr-only">White</p>
                  <span aria-hidden="true" class="h-8 w-8 bg-white border border-black border-opacity-10 rounded-full"></span>
                </label>

                <!--
                  Active and Checked: "ring ring-offset-1"
                  Not Active and Checked: "ring-2"
                -->
                <label class="-m-0.5 relative p-0.5 rounded-full flex items-center justify-center cursor-pointer focus:outline-none ring-gray-400">
                  <input type="radio" name="color-choice" value="Gray" class="sr-only" aria-labelledby="color-choice-1-label">
                  <p id="color-choice-1-label" class="sr-only">Gray</p>
                  <span aria-hidden="true" class="h-8 w-8 bg-gray-200 border border-black border-opacity-10 rounded-full"></span>
                </label>

                <!--
                  Active and Checked: "ring ring-offset-1"
                  Not Active and Checked: "ring-2"
                -->
                <label class="-m-0.5 relative p-0.5 rounded-full flex items-center justify-center cursor-pointer focus:outline-none ring-gray-900">
                  <input type="radio" name="color-choice" value="Black" class="sr-only" aria-labelledby="color-choice-2-label">
                  <p id="color-choice-2-label" class="sr-only">Black</p>
                  <span aria-hidden="true" class="h-8 w-8 bg-gray-900 border border-black border-opacity-10 rounded-full"></span>
                </label>
              </div>
            </fieldset>
          </div>

          <!-- Sizes -->
          <div class="mt-10">
            <div class="flex items-center justify-between">
              <h3 class="text-sm text-gray-900 font-medium">Size</h3>
              <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Size guide</a>
            </div>

            <fieldset class="mt-4">
              <legend class="sr-only">Choose a size</legend>
              <div class="grid grid-cols-4 gap-4 sm:grid-cols-8 lg:grid-cols-4">
                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-gray-50 text-gray-200 cursor-not-allowed">
                  <input type="radio" name="size-choice" value="XXS" disabled class="sr-only" aria-labelledby="size-choice-0-label">
                  <p id="size-choice-0-label">XXS</p>

                  <div aria-hidden="true" class="absolute -inset-px rounded-md border-2 border-gray-200 pointer-events-none">
                    <svg class="absolute inset-0 w-full h-full text-gray-200 stroke-2" viewBox="0 0 100 100" preserveAspectRatio="none" stroke="currentColor">
                      <line x1="0" y1="100" x2="100" y2="0" vector-effect="non-scaling-stroke" />
                    </svg>
                  </div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="XS" class="sr-only" aria-labelledby="size-choice-1-label">
                  <p id="size-choice-1-label">XS</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="S" class="sr-only" aria-labelledby="size-choice-2-label">
                  <p id="size-choice-2-label">S</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="M" class="sr-only" aria-labelledby="size-choice-3-label">
                  <p id="size-choice-3-label">M</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="L" class="sr-only" aria-labelledby="size-choice-4-label">
                  <p id="size-choice-4-label">L</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="XL" class="sr-only" aria-labelledby="size-choice-5-label">
                  <p id="size-choice-5-label">XL</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="2XL" class="sr-only" aria-labelledby="size-choice-6-label">
                  <p id="size-choice-6-label">2XL</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>

                <!-- Active: "ring-2 ring-indigo-500" -->
                <label class="group relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 sm:py-6 bg-white shadow-sm text-gray-900 cursor-pointer">
                  <input type="radio" name="size-choice" value="3XL" class="sr-only" aria-labelledby="size-choice-7-label">
                  <p id="size-choice-7-label">3XL</p>

                  <!--
                    Active: "border", Not Active: "border-2"
                    Checked: "border-indigo-500", Not Checked: "border-transparent"
                  -->
                  <div class="absolute -inset-px rounded-md pointer-events-none" aria-hidden="true"></div>
                </label>
              </div>
            </fieldset>
          </div>

          <button type="submit" class="mt-10 w-full bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Add to bag</button>
        </form>
      </div>

      <div class="py-10 lg:pt-6 lg:pb-16 lg:col-start-1 lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
        <!-- Description and details -->
        <div>
          <h3 class="sr-only">Description</h3>

          <div class="space-y-6">
            <p class="text-base text-gray-900"> {{- product.description | html -}}</p>
          </div>
        </div>

        <div class="mt-10">
          <h3 class="text-sm font-medium text-gray-900">Highlights</h3>

          <div class="mt-4">
            <ul role="list" class="pl-4 list-disc text-sm space-y-2">
              <li class="text-gray-400"><span class="text-gray-600">Hand cut and sewn locally</span></li>

              <li class="text-gray-400"><span class="text-gray-600">Dyed with our proprietary colors</span></li>

              <li class="text-gray-400"><span class="text-gray-600">Pre-washed &amp; pre-shrunk</span></li>

              <li class="text-gray-400"><span class="text-gray-600">Ultra-soft 100% cotton</span></li>
            </ul>
          </div>
        </div>

        <div class="mt-10">
          <h2 class="text-sm font-medium text-gray-900">Details</h2>

          <div class="mt-4 space-y-6">
            <p class="text-sm text-gray-600">The 6-Pack includes two black, two white, and two heather gray Basic Tees. Sign up for our subscription service and be the first to get new, exciting colors, like our upcoming &quot;Charcoal Gray&quot; limited release.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`));
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
