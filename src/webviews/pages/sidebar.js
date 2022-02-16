
// Import F7 Bundle
import Framework7 from 'framework7/lite-bundle';

// Import F7-Svelte Plugin
import Framework7Svelte from 'framework7-svelte';

// Init F7-Svelte Plugin
Framework7.use(Framework7Svelte);

import App from "../components/Sidebar.svelte";


const app = new App({
  target: document.body,
  props: {
    vscode: acquireVsCodeApi(),
    isDarkTheme: document.body.getAttribute('data-vscode-theme-kind') === 'vscode-dark'
  }
});

export default app;
