import { Liquid, LiquidError, TagToken, Context, Emitter, TopLevelToken, Template } from 'liquidjs';
const liquidEngine = new Liquid();
import * as vscode from 'vscode';

const { workspaceFolders } = vscode.workspace;

const templatesFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, 'templates');
const sectionsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, 'sections');
const snippetsFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, 'snippets');

const quoted = /^'[^']*'|"[^"]*"$/;

liquidEngine.registerTag('section', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    let name;
    if (quoted.exec(this.namestr)) {
      const template = this.namestr.slice(1, -1);
      name = await this.liquid.parseAndRender(template, ctx.getAll(), ctx.opts);
    }
    if (!name) { throw new Error(`cannot include with empty filename`); }

    const filepath = vscode.Uri.joinPath(sectionsFolder, name);
    const templates = await vscode.workspace.fs.readFile(filepath);
    const parsed = await liquidEngine.parse(templates.toString());
    return this.liquid.render(parsed);
  }
});


liquidEngine.registerTag('paginate', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});
liquidEngine.registerTag('endpaginate', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('form', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endform', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('schema', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

liquidEngine.registerTag('endschema', {
  parse: function (token) {
    this.namestr = token.args;
  },
  render: async function (ctx, hash) {
    return '';
  }
});

export async function generateAllScripts ()
{
  const templates = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'templates'));
  
  console.log('templates', templates);

  await Promise.all(templates.filter(e => e[1] === 1).map(async template =>
  {
    // generateTemplateScript();
    await generateTemplateScript(vscode.Uri.joinPath(templatesFolder, template[0]), template[0]);
  }));
}

export async function generateTemplateScript(template: vscode.Uri, templateName: string)
{
  const allIncludes = await getAllIncludes(templateName, template);

  console.log('allIncludes', allIncludes);

  // const svelteIncludes = allIncludes.filter(include =>
  // {
  //   return 1;
  // });
}

async function getAllIncludes (templateName: string, firstFile: vscode.Uri)
{
  let allIncludes = [];
  async function getIncludes (file: vscode.Uri)
  {
    // console.log('file ', file.path.split('/').pop());
    const templateFile = await vscode.workspace.fs.readFile(file);
    const parsed = liquidEngine.parse(templateFile.toString());
    // @ts-nocheck
    // @ts-ignore
    const includes = parsed.reduce((col, block) =>
    {
      // @ts-ignore
      const branchTemplates = (block.impl?.branches || []).reduce((col, branch) =>
      {
        return [...col, ...(branch?.templates || [])];
      }, []);
      // @ts-ignore
      return [...col, block, ...branchTemplates,...(block.impl?.templates || [])];
    }, [])
    // @ts-ignore
    .filter(block => block.constructor.name === 'Tag' && (block.name === 'section' || block.name === 'include'))
    // @ts-ignore
    .map(include => ({ hash: include.impl?.hash?.hash, name: include.name, file: (include.impl.namestr || include.impl.file || '').replace(/^["']|["']$/gi, '') }));
    
    // console.log(file.path.split('/').pop(), ' includes ', parsed);
    if (includes.length) {
      allIncludes = [...allIncludes, ...includes];
      await Promise.all(includes.map(async include =>
      {
        const includeUri = vscode.Uri.joinPath(include.name === 'section' ? sectionsFolder : snippetsFolder, `${include.file.replace(/^["']|["']$/gi, '')}.liquid`);
        // console.log('calling sub include', includeUri.path.split('/').pop());
        await getIncludes(includeUri);
      }));
    }
  }
  await getIncludes(firstFile);

  return {
    template: templateName,
    includes: allIncludes
  };
}