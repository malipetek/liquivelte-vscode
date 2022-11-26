import * as vscode from 'vscode';
import state from '../utils/state';
import debounce from 'debounce-async';

async function _generateIncludeScripts ({ themeDirectory })
{
  const workspaceFolders = vscode.workspace.workspaceFolders;

  await Promise.all(Object.keys(state.layouts).map(async layoutname =>
  {
    const layouts = state.layouts;
    const templates = state.templates;
    const layoutContents = state.layoutContents;
    const layout = state.layouts[layoutname];
    const layoutContent = state.layoutContents[layoutname];
    if (!layoutContent) { return; }

    let [beforeComment, afterComment] = layoutContent.split('<!-- liquivelte includes -->');
    let [includeContent, afterInclude] = afterComment.split(/<\!--\s*liquivelte\s*includes\s*end\s*-->/);

    const newContent = `${beforeComment}<!-- liquivelte includes -->
      {% assign templatesWithLiquivelte = '${Object.keys(state.templates)
          .filter(temp => state.templates[temp].hasIncludes).map(temp => temp.replace(/\.[^\.]+$/, '').replace('/', '-')).join(',')}' | split: ',' %}
      {% assign template_with_suffix_and_directory = template %}
      {% if template.directory %}
        {% assign template_with_suffix_and_directory = template.directory | append: '-' | append: template_with_suffix_and_directory %}
        {% endif %}
        {% if template.suffix != blank %}
        {% assign template_with_suffix_and_directory = template_with_suffix_and_directory | append: '.' | template.suffix %}
      {% endif %}
      {% if templatesWithLiquivelte contains template_with_suffix_and_directory %}
        {% assign liquivelte_js_source = '${layoutname.replace('.liquid', '')}.' | append: template_with_suffix_and_directory | append: '.liquivelte.js' %}
        {% assign liquivelte_nm_js_source = '${layoutname.replace('.liquid', '')}.' | append: template_with_suffix_and_directory | append: '.nm.liquivelte.js' %}
        {% assign liquivelte_css_source = '${layoutname.replace('.liquid', '')}.' | append: template_with_suffix_and_directory | append: '.liquivelte.css' %}
        <script type="module" src="{{ liquivelte_js_source | asset_url }}" defer="defer"></script>
        <link rel="stylesheet" rel="preload" as="style" href="{{ liquivelte_css_source | asset_url }}" />
      {% endif %}

      {% include 'liquivelte-criticals' with template: template_with_suffix_and_directory %}
      
      {% if request.design_mode %}
        <script type="module" src="{{ 'liquivelte-sections-loader.js' | asset_url }}" defer="defer"></script>
      {% endif %}
      <!-- liquivelte includes end -->${afterInclude}`;

    // TODO: include fallback scripts for SystemJS
    if (newContent === layoutContent) { return; }
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspaceFolders[0].uri, themeDirectory, 'layout', layoutname), Buffer.from(newContent));
    return;
  }));
}
export const generateIncludeScripts = debounce(_generateIncludeScripts, 500);
