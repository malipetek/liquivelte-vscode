<script >
import { slide } from 'svelte/transition'
export let open = false;
</script>

{#if open }
<div transition:slide class="sheet">
  <slot />
  <div class="bottom">
    <div class="left" />
    <div class="right" on:click={() => open = !open}>
      <slot name="close" />
    </div>
  </div>
</div>
<div class="backdrop" on:click={() => open = false}></div>
{/if}

<style>
  .sheet {
    padding: 1rem;
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--vscode-editor-background);
    z-index: 1;
  }
  .bottom {
    padding: 1rem;
  }
  .bottom {
    display: flex;
    justify-content: space-between;
  }
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    width: 100vw;
    height: 100vh;
    z-index: 0;
  }
</style>