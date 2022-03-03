<script>
  import SchemaOption from "./SchemaOption.svelte";
  import { onMount } from "svelte";
  
  export let options = [];

  const default_attrs = ["label", "value", "group"];

  const createOption = () => {
    const s = {};
    default_attrs.forEach((k) => (s[k] = ""));
    return s;
  };

</script>

{#each options as option, index }
  <SchemaOption bind:option={option} index={index} />
{/each}

<button on:click={() => (options = [...options, createOption()])}>
  Add Option
</button>
<style>
  button {
    margin: 1rem 0;
  }
</style>