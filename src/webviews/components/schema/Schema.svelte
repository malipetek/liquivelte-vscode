<script>
  import Expandable from "../Expandable.svelte";
  import SchemaSettings from "./SchemaSettings.svelte";
  import SidePage from "../SidePage.svelte";
  import { schema } from '../store.js';
  import SchemaSettingInput from "./SchemaSettingInput.svelte";
import { find, indexOf } from "lodash";

  export let exp_open = false;
  export let hide_label = false;
  let blockPageOpenStates = {};
  const valid_keys = [
                      'name',
                      'tag',
                      'class',
                      'limit',
                      'settings',
                      'blocks',
                      'max_blocks',
                      'presets',
                      'default',
                      'locales',
                      'templates',
                      ];
  
  let preset_setting_to_add = "";
  let preset_block_setting_to_add = {};

  $: keys = Object.keys($schema); 

  $: console.log('Schema ', $schema);
</script>

<div schema>
  {#each keys as key, index}
    {#if valid_keys.indexOf(key) > -1 }
      {#if key === 'settings' || key === 'blocks' || key === 'presets' }
        <Expandable indent={false}>
          <span slot="opener"><h3 class="schema-expandable">{ key }</h3></span>
          {#if key === 'settings'}
            <SchemaSettings bind:settings={$schema[key]} />
          {/if}
          {#if key === 'blocks'}
            {#each $schema[key] as block, block_index}
              <div box>
                {#each Object.keys(block) as block_key}
                  {#if block_key === 'settings' }
                    <button class="edit-block" on:click={() => blockPageOpenStates[block_index] = true}> Edit Block Settings </button>
                    <SidePage bind:open={blockPageOpenStates[block_index]}>
                      <h3> Block settings for type: <b>{ block.type }</b> </h3>
                      <SchemaSettings bind:settings={block[block_key]} />
                    </SidePage>
                  {:else}
                    <SchemaSettingInput bind:setting={$schema[key][block_index]} setting_key={block_key} index={block_index} />
                  {/if}
                {/each}
              </div>
            {/each}
            <button class="add-block" on:click={() => 1}> Add Block </button>
          {/if}
          {#if key === 'presets'}
              {#each $schema[key] as preset, preset_index}
                <div box>
                  <h2> Preset {preset_index+1} </h2>
                  {#each Object.keys(preset) as preset_key}
                    {#if preset_key !== 'settings' && preset_key !== 'blocks'}
                      <SchemaSettingInput bind:setting={$schema[key][preset_index]} setting_key={preset_key} index={preset_index} />
                    {/if}
                  {/each}
                  {#if preset.settings }
                  <div box>
                    <h3> Preset Settings </h3>
                    {#each Object.keys(preset.settings) as setting_key, setting_index}
                      <SchemaSettingInput bind:setting={preset.settings} setting_key={setting_key} index={setting_index} />
                    {/each}
                    <select setting bind:value={preset_setting_to_add}>
                      <option value="">Select Setting </option>
                      {#each $schema.settings as setting}
                        {#if setting.id && Object.keys(preset.settings).indexOf(setting.id) === -1}
                          <option value={setting.id}>{ setting.id }</option>
                        {/if}
                      {/each}
                    </select>
                    <button disabled={!preset_setting_to_add} on:click={() => {
                      preset.settings[preset_setting_to_add] = "";
                      preset_setting_to_add = "";
                    }}> Add To Preset </button>
                  </div>
                  {:else}
                    <div box>
                      <button on:click={() => preset.settings = {}}> Init Preset Settings </button>
                    </div>
                  {/if}
                  {#if preset.blocks}
                    <div box>
                      <h3> Preset Blocks </h3>
                      {#each preset.blocks as block, block_index }
                        <div box>
                          <h4> Block { block_index + 1 } </h4>
                          {#each Object.keys(block) as block_key}
                            {#if block_key !== 'settings' && block_key !== 'type' }
                              <SchemaSettingInput bind:setting={preset.blocks[block_index]} setting_key={block_key} index={block_index} />
                            {/if}
                          {/each}
                          <select setting bind:value={block.type}>
                            <option value="">Select Block Type</option>
                            {#each $schema.blocks as block}
                              <option value={block.type}>{ block.type }</option>
                            {/each}
                          </select>
                          {#if block.settings}
                            <div box>
                              <h4> Block Settings </h4>
                              {#each Object.keys(block.settings) as setting_key, setting_index}
                                <SchemaSettingInput bind:setting={block.settings} setting_key={setting_key} index={setting_index} />
                              {/each}
                              {#if block.type }
                              <select setting bind:value={preset_block_setting_to_add[block_index]}>
                                <option value=""> Select </option>
                                {#each (($schema.blocks.find(bl => bl.type === block.type)|| {}).settings || []) as block_setting}
                                  {#if Object.keys(block.settings || {}).indexOf(block_setting.id) === -1}
                                    <option value={block_setting.id}>{ block_setting.id }</option>
                                  {/if}
                                {/each}
                              </select>
                              <button on:click={() => {
                                block.settings[preset_block_setting_to_add[block_index]] = "";
                                preset_block_setting_to_add[block_index] = "";
                              }}> Add Setting </button>
                              {/if}
                            </div>
                          {:else}
                            <button on:click={() => {
                              block.settings = {};
                            }}> Init Settings </button>
                          {/if}
                        </div>
                      {/each}
                      <button on:click={() => preset.blocks = [...preset.blocks, { type: "" }]}> Add Block </button>
                    </div>
                  {:else }
                    <div box>
                      <button on:click={() => preset.blocks = []}> Init Preset Blocks </button>
                    </div>
                  {/if}
                </div>
              {/each}
              <button on:click={() => $schema.presets = [...$schema.presets, { name: "" }]}> Add Preset </button>
          {/if}
        </Expandable>
      {:else}
      <SchemaSettingInput bind:setting={$schema} index={index} setting_key={key} />
      <!-- <div box>
        <label for={`schema_label_${key}`}> { key } </label>
        <input id={`schema_label_${key}`} bind:value={$schema[key]} />
      </div> -->
        <!-- { key }: { schema[key] } <br> -->
      {/if}
    {:else }
      { key } (unknown schema key)
    {/if}
  {/each}
</div>
  
<style>
    div[box] {
    margin: 0.3em 0.1em;
    padding: 0.2em 0.1em 0.2em 0.3em;
    border: 1px solid rgba(204, 204, 204, 0.342);
    background-color:rgba(142, 142, 142, 0.1)
  }
  div[schema] {
    margin: .2em .2em .2em 0;
    padding: .2em .2em .2em 0;
  }
  span[name] {
    color: var(--vscode-debugTokenExpression-name);
  }
  .string {
    color: var(--vscode-debugTokenExpression-string);
    white-space: nowrap;
  }

  .number {
    color: var(--vscode-debugTokenExpression-number);
  }

  .boolean {
    color: var(--vscode-debugTokenExpression-boolean);
  }
  .schema-expandable {
    color: var(--vscode-textLink-foreground);
  }
  button {
    margin-bottom: 1em;
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
</style>