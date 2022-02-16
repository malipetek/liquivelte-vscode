<script>
  import { slide } from 'svelte/transition';
  export let open = false; 
</script>

<div on:click={() => open = !open } class:open={open} class="opener-container" >
  <svg class="arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M24 24H0V0h24v24z" fill="none" opacity=".87"/><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/></svg>
  <slot name="opener" />
</div>

{#if open}
  <div transition:slide>
    <slot />
  </div>
{/if}

<style>
  .opener-container {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  .arrow {
    width: 2em;
    margin-right: 1em;
    color: var(--vscode-foreground);
    fill: currentColor;
    transform: rotate(-90deg);
    transition: transform 0.2s ease-in-out;
  }
  .open .arrow {
    transform: rotate(0deg);
  }
</style>