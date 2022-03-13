import App from "../components/Sidebar.svelte";


const app = new App({
  target: document.body,
  props: {
    vscode: acquireVsCodeApi(),
    isDarkTheme: document.body.getAttribute('data-vscode-theme-kind') === 'vscode-dark'
  }
});

export default app;
