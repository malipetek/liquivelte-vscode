<script>
  import { fly } from 'svelte/transition';
  export let open = false;
  export let title = '';
</script>

{#if open}
<div class="sidepage" transition:fly={{x: window.innerWidth}}>
  <div class="header">
    <span on:click={() => open = false}> <svg viewBox="0 0 24 24" width="24px" ><path d="M0 0h24v24H0z" fill="none"/><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> </span>
    <span> {#if title} { title } {:else} <slot name="title" /> {/if}</span>
  </div>
  <div class="content">
    <slot />
  </div>
</div>
{/if}

<style>
  .sidepage {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow-y: scroll;
    background-color: var(--vscode-editor-background);
    padding: 2em 1em;
    z-index: 20;
  }
  .header {
    display: flex;
    margin-bottom: 1.5em;
  }
  svg {
    color: var(--vscode-foreground);
    fill: currentColor;
    margin-right: 1em;
  }
</style>