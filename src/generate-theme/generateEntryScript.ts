import { parsedToken } from './types';
import toCamelCase from '../utils/to-camel-case';

export async function generateCombinedEntryScript (layoutScript, template)
{
  return layoutScript
    .replace('// include template module',
      `import "../.templates/${template}.js";
  `);
}
export async function generateLayoutScript (svelteIncludes: parsedToken[]): Promise<string>
{
  try {
    const includedModules = [];
    svelteIncludes = svelteIncludes.filter(include =>
    {
      if (includedModules.indexOf(include.includeName) === -1) {
        includedModules.push(include.includeName);
        return true;
      }
      if (include.tagName === 'section' && includedModules.indexOf(include.includeName) === -1) {
        includedModules.push(include.includeName);
        return true;
      }
      return false;
    });
    return `
  const onIntersect = (el, callback) => {
    const observer = new IntersectionObserver(callback, {
      root: null,   // default is the viewport
      rootMargin: '100px', // default is '0px'
      threshold: 0 // percentage of taregt's visible area. Triggers "onIntersection"
    });
    observer.observe(el);
  };
  
  /* {% comment %} DO NOT REMOVE THIS LINE {% endcomment %} */
  // include template module

  document.addEventListener('DOMContentLoaded', () => {
    ` +
      svelteIncludes.reduce((acc, include) => `${acc}
  Array.from(document.querySelectorAll('.liquivelte-component.${include.props.module || include.includeName}')).forEach(wrapper => {
    let svelteProps = wrapper.svelteProps;
    let rawIncludes = wrapper.rawIncludes;
    let liquid_expression_cache = wrapper.liquid_expression_cache;
    wrapper.module_loaded = true;
    let initialized = false;
    onIntersect(wrapper, ([entry]) => {
      (async () => {
        if(entry.isIntersecting && !initialized) {
          initialized = true;
          wrapper.svelteComponent = new (await import("../${include.tagName === 'section' ? 'sections' : 'snippets'}/${include.isFolder ? `${include.props.module || include.includeName}/index` : include.props.module || include.includeName}.liquivelte")).default({
            target: wrapper,
            hydrate: true,
            props: {
                ...svelteProps,
                ...rawIncludes,
                lec: liquid_expression_cache
            }
          });
        }
      })();
    });
  });
  `, '') + `
  });`;
  } catch (err) {
    throw err;
  }
}


export async function generateTemplateScript (svelteIncludes: parsedToken[]): Promise<string>
{
  try {
    const includedModules = [];
    svelteIncludes = svelteIncludes.filter(include =>
    {
      if (includedModules.indexOf(include.props.module) === -1) {
        includedModules.push(include.props.module);
        return true;
      }
      if (include.tagName === 'section' && includedModules.indexOf(include.includeName) === -1) {
        includedModules.push(include.includeName);
        return true;
      }
      return false;
    });
    return `
  const onIntersect = (el, callback) => {
    const observer = new IntersectionObserver(callback, {
      root: null,   // default is the viewport
      rootMargin: '100px', // default is '0px'
      threshold: 0 // percentage of taregt's visible area. Triggers "onIntersection"
    });
    observer.observe(el);
  };

  document.addEventListener('DOMContentLoaded', () => {
    ` +
      svelteIncludes.reduce((acc, include) => `${acc}
  Array.from(document.querySelectorAll('.liquivelte-component.${include.props.module || include.includeName}')).forEach(wrapper => {
    let svelteProps = wrapper.svelteProps;
    let rawIncludes = wrapper.rawIncludes;
    let liquid_expression_cache = wrapper.liquid_expression_cache;
    wrapper.module_loaded = true;
    let initialized = false;
    onIntersect(wrapper, ([entry]) => {
      (async () => {
        if(entry.isIntersecting && !initialized) {
          initialized = true;
          wrapper.svelteComponent = new (await import("../${include.tagName === 'section' ? 'sections' : 'snippets'}/${include.isFolder ? `${include.props.module || include.includeName}/index` : include.props.module || include.includeName}.liquivelte")).default({
            target: wrapper,
            hydrate: true,
            props: {
                ...svelteProps,
                ...rawIncludes,
                lec: liquid_expression_cache
            }
          });
        }
      })();
    });
  });
  `, '') + `
  });`;
  } catch (err) {
    throw err;
  }
}

export async function generateAllSectionsScript (sections): Promise<string>
{
  try {
    return `
  let liquivelteSections = new Map;
    ` +
      sections.reduce((acc, section) =>
      {
        let isFolder = section.indexOf('.liquivelte') === -1;
        section = section.replace('.liquivelte', '');
        return `${acc}
        liquivelteSections.set('${section}', {
          js: "{{ '${section}.liquivelte.js' | asset_url }}",
          css: "{{ '${section}.liquivelte.css' | asset_url }}"
        });
        `;
      }, '') + `
    window.liquivelteSections = liquivelteSections;
    
    window.loadLiquivelteSection = async (sectionName, wrapper) => {
      if(liquivelteSections.has(sectionName)) {
        const entry = liquivelteSections.get(sectionName);
        const liquivelteComponent = await import(entry.js);
        
        let svelteProps = wrapper.svelteProps;
        let rawIncludes = wrapper.rawIncludes;
        let liquid_expression_cache = wrapper.liquid_expression_cache;

        const cssFile = document.createElement('link');
        cssFile.rel = 'stylesheet';
        cssFile.href = entry.css;
        document.head.appendChild(cssFile); 
        
        wrapper.svelteComponent = new liquivelteComponent.default({
          target: wrapper,
          hydrate: true,
          props: {
              ...svelteProps,
              ...rawIncludes,
              lec: liquid_expression_cache
          }
        });
        
      }
    }

    document.addEventListener('shopify:section:load', e => {
      let liquivelteWrapper = e.srcElement.querySelector('.liquivelte-component');
      if(liquivelteWrapper) {

        [...liquivelteWrapper.querySelectorAll('script[liquivelte-keep]')].forEach(sc => {
          eval(sc.textContent);
        });
        let sectionName = liquivelteWrapper.getAttribute('data-liquivelte-component-name');
        [...liquivelteWrapper.querySelectorAll('script.liquivelte-prop-script')].forEach(propScript => {
          window.propScriptForDesignMode = propScript;
          eval(window.propScriptForDesignMode.innerText);
        });
        window.loadLiquivelteSection(sectionName, liquivelteWrapper);
      }
    });
    document.addEventListener('shopify:section:unload', e => {
      console.log('section unload', e);
      let liquivelteWrapper = e.srcElement.querySelector('.liquivelte-component');
      if(liquivelteWrapper && liquivelteWrapper.svelteComponent && liquivelteWrapper.svelteComponent.$destroy) {
        liquivelteWrapper.svelteComponent.$destroy();
      }
    });

    window.addEventListener('load', () => {
      setTimeout(() => {
        [...document.querySelectorAll('.liquivelte-component')].filter(el => !el.module_loaded).forEach(liquivelteWrapper => {
          if(liquivelteWrapper) {
            let sectionName = liquivelteWrapper.getAttribute('data-liquivelte-component-name');
            console.log('liquivelte section "' + sectionName + '" is loaded but is not bundled, run build process with up to date json template data on your local.');
            window.loadLiquivelteSection(sectionName, liquivelteWrapper);
          }
        });
      }, 1000);
    });
`;
  } catch (err) {
    throw err;
  }
}
export async function generateSectionScript (section, isFolder): Promise<string>
{
  try {
    return `
    import ${toCamelCase(section)} from "../sections/${isFolder ? `${section}/index` : section}.liquivelte"
    export default ${toCamelCase(section)}
    `;
    return `
    const initializeLiquvelteComponent = (wrapper) => {
      let svelteProps = wrapper.svelteProps;
      let rawIncludes = wrapper.rawIncludes;
      let liquid_expression_cache = wrapper.liquid_expression_cache;
  
      let initialized = false;
        (async () => {
          if(entry.isIntersecting && !initialized) {
            initialized = true;
            new (await import("../sections/${isFolder ? `${section}/index` : section}.liquivelte")).default({
              target: wrapper,
              hydrate: true,
              props: {
                  ...svelteProps,
                  ...rawIncludes,
                  lec: liquid_expression_cache
              }
          });
        }
      })();
    }
    document.addEventListener('shopify:section:load', (e) => {
      console.log('section loaded', e);
    });
  `;
  } catch (err) {
    throw err;
  }
}