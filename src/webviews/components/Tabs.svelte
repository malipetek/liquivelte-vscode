<script>
  let openTab = 1;
</script>
<div class="tab-buttons"> 
  <div class="tab-button" class:active={openTab === 1} on:click={() => openTab = 1}><slot name="button1" /></div>
  <div class="tab-button" class:active={openTab === 2} on:click={() => openTab = 2}><slot name="button2" /></div>
  <div class="tab-button" class:active={openTab === 3} on:click={() => openTab = 3}><slot name="button3" /></div>
</div>
<div>
  {#if openTab == 1}
  <div >
    <slot name="tab1"></slot>
  </div>
  {/if}
  {#if openTab == 2}
  <div >
    <slot name="tab2"></slot>
  </div>
  {/if}
  {#if openTab == 3}
  <div>
    <slot name="tab3"></slot>
  </div>
  {/if}
</div>
<style>
  .tab-buttons {
    display: flex;
    justify-content: space-around;
  }
  .tab-button {
    flex: 1 1 auto;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1em;
  }
  .tab-button.active {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .tab-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>