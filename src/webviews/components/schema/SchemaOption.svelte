<script>

  import SchemaSettingInput from "./SchemaSettingInput.svelte";
  
  // export let index;
  export let option = {
      value: "",
      label: "",
      group: ""
    };
$: option_keys = Object.keys(option);
</script>

<div box>
  {#each option_keys as key, index}
    <SchemaSettingInput index={index} bind:setting={option} setting_key={key} />      
  {/each}
</div>

<style>
  div[box] {
    margin: 0.3em 0.1em;
    padding: 0.2em 0.1em;
    border: 1px solid rgba(204, 204, 204, 0.342);
  }
</style>
