<script>

  import SidePage from "../SidePage.svelte";
  import SchemaSettingInput from "./SchemaSettingInput.svelte";
  import SchemaOptions from "./SchemaOptions.svelte";
  import { convertSetting, setting_types, newSetting } from '../../utils/settings.js';
  export let index;
  let optionPages = {};
  export let setting;

  let initialSetting;
  $: if(setting && !initialSetting) {
    initialSetting = setting;
  }

  $: current_keys = Object.keys(setting);
</script>

<div box>
  <select setting bind:value={setting.type} on:change={() => setting = convertSetting(initialSetting, setting)} >
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
