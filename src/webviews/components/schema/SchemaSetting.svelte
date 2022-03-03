<script>

  import SidePage from "../SidePage.svelte";
  import SchemaSettingInput from "./SchemaSettingInput.svelte";
  import SchemaOptions from "./SchemaOptions.svelte";

  export let index;
  let optionPages = {};
  export let setting;

  let initialSetting;
  $: if(setting && !initialSetting) {
    initialSetting = setting;
  }

  const setting_types = [
    "header",
    "paragraph",

    "checkbox",
    "number",
    "radio",
    "range",
    "select",
    "text",
    "textarea",

    "article",
    "blog",
    "collection",
    "color",
    "color_background",
    "font_picker",
    "html",
    "image_picker",
    "link_list",
    "liquid",
    "page",
    "product",
    "richtext",
    "url",
    "video_url",
  ];

  const default_attrs = ["id", "label", "default", "info"];

  const setting_keys = {
    header: ["content"],
    paragraph: ["content"],
    checkbox: [...default_attrs],
    number: [...default_attrs, "placeholder"],
    radio: [...default_attrs, "options"],
    range: [...default_attrs, "min", "max", "step", "unit"],
    select: [...default_attrs, "options"],
    text: [...default_attrs, "placeholder"],
    textarea: [...default_attrs, "placeholder"],

    article: [...default_attrs],
    blog: [...default_attrs],
    collection: [...default_attrs],
    color: [...default_attrs],
    color_background: [...default_attrs],
    font_picker: [...default_attrs],
    html: [...default_attrs, "placeholder"],
    image_picker: [...default_attrs],
    link_list: [...default_attrs],
    liquid: [...default_attrs],
    page: [...default_attrs],
    product: [...default_attrs],
    richtext: [...default_attrs],
    url: [...default_attrs],
    video_url: [...default_attrs],
  };

  const newSetting = () => {
    const s = {};
    default_attrs.forEach((k) => (s[k] = ""));
    return s;
  };

  const convertSetting = () => {
    const type = setting.type;
    const _setting = { ...setting };
    for(let key in _setting) {
      if(key !== 'type' && setting_keys[type].indexOf(key) === -1) {
        delete _setting[key];
      }
    }
    for(let key in setting_keys[type]) {
      _setting[setting_keys[type][key]] = _setting[setting_keys[type][key]] || initialSetting[setting_keys[type][key]] || (setting_keys[type][key] === 'options' ? [] : "");
    }
    
    setting = {..._setting, type};
  };

  $: current_keys = Object.keys(setting);
</script>

<div box>
  <select setting bind:value={setting.type} on:change={convertSetting} >
    <option value="">Select a setting type</option>
    {#each setting_types as type}
      <option value={type}>{type}</option>
    {/each}
  </select>

  {#each current_keys as setting_key, index}
    {#if setting_key !== "options" && setting_key !== "type"}
      <SchemaSettingInput index={index} bind:setting bind:setting_key />      
    {/if}
  {/each}

  {#if setting.options }
    <button on:click={() => optionPages[index] = true}> Edit options </button>
    <SidePage bind:open={optionPages[index]}>
      <SchemaOptions bind:options={setting.options} setting_key={index} index={index} />
    </SidePage>
  {/if}
</div>

<style>
  div[box] {
    margin: 0.3em 0.1em;
    padding: 0.2em 0.1em;
    border: 1px solid rgba(204, 204, 204, 0.342);
  }

  select[setting] {
    margin: 0.5em 0.1em;
    padding: 0.3em 0.5em;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    max-width: 98%;
  }
  button {
    margin: 1em 0;
  }
</style>
