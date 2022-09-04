import state from "./state";
import * as vscode from 'vscode';
import crittr from '@liquivelte/crittr';
import puppeteer from 'puppeteer-core';
import { findChrome } from 'find-chrome-bin';

export default async function generateCritical ()
{
  let browser;
  try {
    // @ts-ignore
    const { executablePath } = await findChrome();
    
    const baseUrl = new URL('http://127.0.0.1:9292');
    browser = await puppeteer.launch({
      headless: true,
      executablePath
    });

    let connectToBrowser = () => puppeteer.connect({
      browserWSEndpoint: browser.wsEndpoint()
    });
    let page = (await browser.pages())[0];
    await page.goto(baseUrl.href + `collections/all`);
    const passwordRequired = await page.evaluate(`!!(document.querySelector('password-modal') || document.querySelector('[name=password]'));`);
    if (passwordRequired) {
      if (!state.criticalConfig.store_password) {
        browser.close();
        return 'Store password is required';
      }

      await page.evaluate(`document.querySelector('password-modal') ? document.querySelector('password-modal').click() : '';`);
      await new Promise(d => setTimeout(d, 500));
      await page.evaluate(`document.querySelector('[name=password]').value = '${state.criticalConfig.store_password}';`);
      await page.evaluate(`document.querySelector('[name="commit"],[type=submit]').click();`);
      await page.waitForNavigation();
      const failed = await page.evaluate(`document.querySelector('#PasswordLoginForm-password-error') || document.querySelector('[name=password]');`);
      if (failed) {
        throw new Error('Store password is wrong');
      }
    }

    let result = '';
    // const productUrl = await page.evaluate(`(document.querySelector('[href*="products\\/"]')||document.createElement('div')).getAttribute('href');`);

    const defaultPaths = {
      'index': '/',
      'collection': '/collections/all',
      'list-collections': '/collections',
      '404': '/404',
      'cart': '/cart',
      'page': '/search',
    };

    let criticalSnippet = `
<style>
{% case template %}
`;
    for (let template in state.templates) {
      const [templateName, alternameName] = [...(template.match(/([^\.]+)(?=\.)/g) || [])];
      let cssContent = '';
      try {
        // @ts-ignore
        const cssFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, state.themeDirectory, 'assets', `${templateName}${alternameName ? `.${alternameName}` : ''}.liquivelte.css`)
        const cssFile = await vscode.workspace.fs.readFile(cssFileUri);
        cssContent += cssFile.toString();
      } catch (e) {
        console.log('could not get template css ', template, e.message)
      }
      try {
        const layoutName = state.templates[template].layout;
        if (layoutName) { 
          // @ts-ignore
          const cssFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, state.themeDirectory, 'assets', `${layoutName}.liquivelte.css`)
          const cssFile = await vscode.workspace.fs.readFile(cssFileUri);
          cssContent += cssFile.toString();
        }
      } catch (e) {
        console.log('could not get layout css ', state.templates[template].layout, e.message)
      }

      let pathFromConfig = state.criticalConfig[`path-for-${template}`];
      try {
        const u = new URL(pathFromConfig);
        pathFromConfig = u.pathname
      } catch (err) {

      } 
      const url = new URL(baseUrl.href);
      let path = defaultPaths[templateName] || pathFromConfig;
      let enabled = state.criticalConfig[`${template}-enabled`];
        url.pathname = path;
        url.searchParams.append('nocrit', '');
      
      if (enabled && path && cssContent) {
        const { critical, rest } = await crittr({
          urls: [url.href],
          css: cssContent,
          renderWaitTime: 5000,
          timeout: 10e3,
          blockJSRequests: true,
          puppeteer: {
              browser,
          }
        });
        // const criticalMobile = await penthouse({
        //   url: url.href,
        //   cssString: cssContent,
        //   renderWaitTime: 5000,
        //   width: 380,
        //   height: 730,
        //   timeout: 3e3,
        //   blockJSRequests: true,
        //   puppeteer: {
        //       getBrowser: connectToBrowser,
        //       pageGotoOptions: { waitUntil: 'networkidle0', }
        //   }
        // });
        
      criticalSnippet += `
  {% when '${templateName}${alternameName ? `.${alternameName}` : ''}' %}
    ${critical}
`;
        result += `
Critical css generated for ${templateName}${alternameName ? `.${alternameName}` : ''}`;
      }

    }
    criticalSnippet += `      
{% endcase %}
</style>
`;
    const criticalFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, state.themeDirectory, 'snippets', `liquivelte-criticals.liquid`)
    await vscode.workspace.fs.writeFile(criticalFileUri, Buffer.from(criticalSnippet));

    await browser.close();
    return result;
  } catch (err) {
    browser && browser.close();
    return err.message;
  }
}
