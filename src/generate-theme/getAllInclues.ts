import * as vscode from 'vscode';
import path from 'path';
import { parsedToken } from './types';
import state from '../utils/state';

export async function getAllIncludes (templateName: string, firstFile: vscode.Uri, themeDirectoryProvided: string, followIncludes: boolean = true): Promise<{ [key: string]: any, svelteIncludes: parsedToken[] }>
{
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let layout = 'theme';
  let allIncludes: parsedToken[] = [];
  const parsedFiles = new Map;
  const liquivelteSections = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).map(pair => pair[0]);
  const liquivelteSectionFolders = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'src', 'sections'))).filter(pair => pair[1] == 2).map(pair => pair[0]);


  function checkLiquivelteInclude (e)
  {
    return e.includeName === 'liquivelte' || (e.tagName === 'section' && (liquivelteSections.includes(`${e.includeName}.liquivelte`) || liquivelteSections.includes(e.includeName)));
  }

  async function getIncludes (file: vscode.Uri)
  {
    try {
      const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'sections');
      const snippetsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectoryProvided, 'snippets');
      // console.log('file ', file.path.split('/').pop());
      let templateFile;
      try {
        templateFile = (await vscode.workspace.fs.readFile(file)).toString();
      } catch (err) {
        console.log('include file is not found', file);
      }
      parsedFiles.set(file.fsPath, templateFile);
      if (path.parse(file.path).ext === '.json') {
        const json = JSON.parse(templateFile.toString());
        layout = json.layout === undefined ? layout : json.layout;

        const sections = Object.keys(json.sections).map(sectionName => json.sections[sectionName].type);
        /*******************************************************
         * IF IT IS A LIQUIVELTE SECTION WE MAKE IT AN INCLUDE *
         *******************************************************/
        let sectionIncludes = sections.filter(section =>
        {
          // @ts-ignore
          return liquivelteSections.indexOf(`${section}.liquivelte`) !== -1 || liquivelteSectionFolders.indexOf(section) !== -1;
        });

        allIncludes = [...allIncludes, ...sectionIncludes.map(section => ({ includeName: section, tagName: 'section', props: {}, isFolder: liquivelteSectionFolders.indexOf(section) !== -1 }))];

        /*********************************************************
         * IF IT IS NOT WE GET ALL SECTIONS AND CONCATENATE THEM *
         *********************************************************/
        templateFile = (await Promise.all(sections.filter(section => sectionIncludes.indexOf(section) === -1 && liquivelteSectionFolders.indexOf(section) === -1).map(async section =>
        {
          let _file = '';
          try {
            if (liquivelteSectionFolders.indexOf(section) !== -1) {
              _file = (await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, section, `index.liquid`))).toString();
            } else {
              _file = (await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sectionsFolder, `${section}.liquid`))).toString();
            }
          } catch (err) {
            console.log('include file is not found', section);
          }
          return _file;
        }))).reduce((acc, curr) => acc + curr, '');
      }

      const parsed: parsedToken[] = [];
      (templateFile || '').replace(/\{%-?\s(\w+)[\s\n]['"]([^"']+)['"]?(?:with|,)?([^%]*)-?%\}/gim, (a, tagName, includeName, afterWithOrComma, offset) =>
      {
        let props = {};
        if (tagName === 'include' || tagName === 'render') {
          (afterWithOrComma || '').replace(/(with|,)?[\s\n]*((\w+):\s*['"]([^"']+)['"])/g, (a, withOrComma, exp, key, value) =>
          {
            props[key] = value;
            return '';
          });
        }


        parsed.push({
          tagName,
          includeName,
          props
        });
        return '';
      });
      (templateFile || '').replace(/\{%-?\s(\w+)[\s\n]['"]?([^"'\s]+)['"]?\s*-?%\}/gim, (a, tagName, includeName, afterWithOrComma, offset) => {
      
        if (tagName === 'layout') {
          layout = includeName == 'none' ? false : includeName;
        }

      });

      // @ts-nocheck
      // @ts-ignore
      const includes = parsed
        .filter(block => block.tagName === 'section' || block.tagName === 'include' || block.tagName === 'render');

      // console.log(file.path.split('/').pop(), ' includes ', parsed);
      if (includes.length) {
        allIncludes = [...allIncludes, ...includes.map(block => ({...block, isFolder: block.tagName === 'section' && liquivelteSectionFolders.indexOf(block.includeName) !== -1 }))];
        await Promise.all(includes.map(async block =>
        {
          const isLiquivelteInclude = checkLiquivelteInclude(block);
          const includeUri = vscode.Uri.joinPath(block.tagName === 'section' ? sectionsFolder : snippetsFolder, `${block.includeName}.liquid`);
          // console.log('calling sub include', includeUri.path.split('/').pop());

          if (followIncludes && !parsedFiles.has(includeUri.fsPath) && !isLiquivelteInclude) {
            await getIncludes(includeUri);
          }
        }));
      }
    } catch (err) {
      console.log('error getting includes ', err);
    }
  }

  await getIncludes(firstFile);

  let svelteIncludes = allIncludes.filter(e => checkLiquivelteInclude(e));

  return {
    template: templateName,
    includes: allIncludes,
    liquivelteSections,
    svelteIncludes,
    hasIncludes: !!svelteIncludes.length,
    loading: state.templates[templateName]?.loading || state.layouts[templateName]?.loading || false,
    layout
  };
}