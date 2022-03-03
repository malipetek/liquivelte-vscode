<script>
  import SidePage from "../SidePage.svelte";
  import { sectionTranslations } from '../store.js';
  export let translatePageOpen = false;
  export let index;
  export let setting = {};
  export let setting_key;

  function getTranslation(locale) {
    const accessors = setting[setting_key].match(/^t:(.*)/)[1].split('.');
    const value = accessors.reduce((obj, k) => obj[k], $sectionTranslations[locale]);
    return value;
  }
  
  function setTranslation(e, locale) {
    const value = e.currentTarget.value;
    const accessors = setting[setting_key].match(/^t:(.*)/)[1].split('.');
    accessors.reduce((obj, k, i, a) => {
      if (i === a.length - 1) {
        obj[k] = value;
      }
      return obj[k];
    }, $sectionTranslations[locale]);
    // sectionTranslations.set(JSON.parse(JSON.stringify($sectionTranslations)));
    $sectionTranslations = {...$sectionTranslations}; 
  }

  function getTranslationObj(locale) {
    const accessors = setting[setting_key].match(/^t:(.*)/)[1].split('.');
    const obj = accessors.reduce((obj, k, i, a) => {
      if (i === a.length - 1) {
        return obj[k]
      }
      return obj[k];
    }, $sectionTranslations[locale]);
    return obj;
  }

  
  // let translationReferences = {};

  $: console.log('$translations ', $sectionTranslations);
  
  // $: if($sectionTranslations && /^t:(.*)/g.test(setting[setting_key])) {
  //   Object.keys($sectionTranslations).map(locale => {
  //     translationReferences[locale] = getTranslationObj(locale);
  //   });
  // }

</script>
<div setting>
  {#if /^t:(.*)/gi.test(setting[setting_key])}
    <div
      title="Translate"
      class="translate-button"
      on:click={() => (translatePageOpen = true)}
    >
      <svg viewBox="0 0 24 24" width="24px"
        ><path d="M0 0h24v24H0z" fill="none" /><path
          d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
        /></svg
      >
    </div>
    <SidePage
      bind:open={translatePageOpen}
      >
      <h3 slot="title">
        Translate
        {setting_key}
        {#if setting.id}
          of {setting.id}
        {/if}
      </h3>
      <div>

        {#each Object.keys($sectionTranslations) as locale}
        <div class="translation-input" class:en={locale === 'en'} >
          <label for={`translate_${locale}_${setting_key}_${index}`}>
            {locale}
          </label>
          <input 
              id={`translate_${locale}_${setting_key}_${index}`} 
              type="text" 
              value={(() => getTranslation(locale))()} 
              on:change={(e) => setTranslation(e, locale)}
            />
          </div>
        {/each}
      </div>
    </SidePage>
  {/if}
  <label for={`${setting_key}_${index}`}>
    <div class="setting-label">
      {setting_key}
    </div>
    <input
      id={`${setting_key}_${index}`}
      type="text"
      bind:value={setting[setting_key]}
    />
  </label>
</div>
<style>
  *[setting] {
    margin: 0.5em 0.1em .5em 0;
    padding: 0.2em 0.1em .2em 0;
    position: relative;
  }
  .setting-label {
    font-weight: bold;
    margin: 0.5em 0.2em;
  }
  svg {
    color: var(--vscode-foreground);
    fill: currentColor;
  }

  .translate-button {
    position: absolute;
    right: 4px;
    cursor: pointer;
  }
  .translate-button:hover {
    background-color: rgba(255, 255, 255, 0.157);
  }
  .translation-input.en {
    font-size: 1.5em;
    background-color: var(--vscode-editor-wordHighlightStrongBackground);
  }
  .translation-input {
    margin: .5em 0;
    padding: .2em;
    background: var(--vscode-editor-wordHighlightBackground);
  }
  label {
    margin-left: .3em;
    margin-right: .3em;
  }
</style>