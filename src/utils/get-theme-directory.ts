import vscode from 'vscode';
import { parseAsYaml } from 'parse-yaml';
import { getAllIncludes } from '../generate-theme/process-theme';
import state from './state';

state.set = { layoutContents: {}, templates: {}, layouts: {} };
export default async function ()
{
  let themeDirectory = '';
  let templates = {};
  let layouts = {};
  let presetsSame = true;
  const { workspaceFolders } = vscode.workspace;
  let folders = await vscode.workspace.fs.readDirectory(workspaceFolders[0].uri);
  let srcFolder = folders.find(folder => folder[0] === 'src' && folder[1] === 2);
  
  const configFile = folders.find(folder => folder[0] === 'config.yml' && folder[1] === 1);
  if (configFile) {
    const configString = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceFolders[0].uri, 'config.yml'))
    const config = parseAsYaml(configString);

    let directories = [];
    for (let presetName in config) {
      directories.push(config[presetName].directory);
    }
    directories = directories.filter(dir => dir !== undefined);
    // check if all entry is same
    if (directories.length > 0 && !directories.every(dir => dir === directories[0])) {
      // vscode.window.showErrorMessage('Config file has different directories set as theme directory', "OK");
      presetsSame = false;
      
      return {
        srcFolder,
        configFile,
        presetsSame,
        templates,
        layouts,
        isTheme: false,
        themeDirectory: '',
        folders: [],
        workspaceFolders: []
      }
    }

    themeDirectory = directories[0];
  } else {
    themeDirectory = '.';
  }

  state['templates'] = templates;
  state['layouts'] = layouts;
  state['themeDirectory'] = themeDirectory;

  let isTheme = false;
  try {
    folders = themeDirectory ? await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory)) : folders;
  } catch (e) {
    themeDirectory = '';
    // vscode.window.showErrorMessage('Theme directory in the config file not found. ' + vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory), "OK");
  }

  if (folders.some(folder => folder[0] === 'layout' && folder[1] === 2) &&
    folders.some(folder => folder[0] === 'templates' && folder[1] === 2) &&
    folders.some(folder => folder[0] === 'sections' && folder[1] === 2) &&
    folders.some(folder => folder[0] === 'assets' && folder[1] === 2) &&
    folders.some(folder => folder[0] === 'snippets' && folder[1] === 2)
  ) {
    isTheme = true;
  }

  if (isTheme) { 

    let templatesArr = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates'));
    let layoutsArr = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout'));

      // @ts-ignore
    templatesArr = await Promise.all(templatesArr.map(async template => template[1] === 2 ? (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates', template[0]))).map(file => [`${template[0]}/${file[0]}`, file[1]]) : template));
  // flatten array
    templatesArr = templatesArr.reduce((acc, val) => Array.isArray(val[0]) ? [...acc, ...val] : [...acc, val], []);
    
    templates = (await Promise.all(templatesArr.map(async templateFile => {
      return srcFolder ? await getAllIncludes(templateFile[0], vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates', templateFile[0]), themeDirectory) : { template: templateFile[0], includes: [] };
    }))).reduce((col, entry) =>
      ({ ...col, [entry.template]: entry }),
      {});
    layouts = (await Promise.all(layoutsArr.map(async templateFile => {
      return srcFolder ? await getAllIncludes(templateFile[0], vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', templateFile[0]), themeDirectory, false) : { template: templateFile[0], includes: [] };
    }))).reduce((col, entry) =>
      ({ ...col, [entry.template]: entry }),
      {});
    
      state['layoutsArr'] = layoutsArr;
  }

  state['templates'] = templates;
  state['layouts'] = layouts;
  state['themeDirectory'] = themeDirectory;
  state['srcFolder'] = srcFolder;
  
  return {
    srcFolder,
    presetsSame,
    configFile,
    themeDirectory,
    templates,
    layouts,
    isTheme,
    folders,
    workspaceFolders
  }
}