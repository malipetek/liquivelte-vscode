import vscode from 'vscode';
import { parseAsYaml } from 'parse-yaml';
import { getAllIncludes } from '../generate-theme/process-theme.js';
import state from './state';
  
export default async function ()
{
  let themeDirectory = '';
  let templates = {};
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
        isTheme: false,
        themeDirectory: '',
        folders: [],
        workspaceFolders: []
      }
    }

    themeDirectory = directories[0];
  }

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

  if (themeDirectory) {
    let templatesArr = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates'));
    // @ts-ignore
    templatesArr = await Promise.all(templatesArr.map(async template => template[1] === 2 ? (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates', template[0]))).map(file => [`${template[0]}/${file[0]}`, file[1]]) : template));
    // flatten array
    templatesArr = templatesArr.reduce((acc, val) => Array.isArray(val[0]) ? [...acc, ...val] : [...acc, val], []);
    templates = (await Promise.all(templatesArr.map(async templateFile => {
      return await getAllIncludes(templateFile[0], vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'templates', templateFile[0]), themeDirectory);
    }))).reduce((col, entry) => ({...col, [entry.template]: entry }), {});
  }

  return {
    srcFolder,
    presetsSame,
    configFile,
    themeDirectory,
    templates,
    isTheme,
    folders,
    workspaceFolders
  }
}