<script>
  import { getContext } from 'svelte';

  export let href;
  export let line = 0;
  export let folder = false;
  let vscode = getContext('vscode');

  const openFile = () => {
    if(folder) {
      vscode.postMessage({
              type: "open-folder",
              link: `${href}#${line}`
          }); 
    } else {
      vscode.postMessage({
              type: "open-file",
              link: `${href}#${line}`
          }); 
    }
  }
</script>

<a on:click|preventDefault={openFile} href={href}>
  <slot />
</a>