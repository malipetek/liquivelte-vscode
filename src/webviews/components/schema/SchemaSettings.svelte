<script>
  import SchemaSetting from "./SchemaSetting.svelte";
  import { onMount } from "svelte";
  
  export let settings = [];

  const default_attrs = ["id", "label", "default", "info"];

  const createSetting = () => {
    const s = {};
    default_attrs.forEach((k) => (s[k] = ""));
    return s;
  };

</script>

{#each settings as setting, index }
  <SchemaSetting bind:setting={setting} index={index} />
{/each}

<button on:click={() => (settings = [...settings, createSetting()])}>
  Add Setting
</button>
<style>
  button {
    margin: 1em 0;
  }
</style>