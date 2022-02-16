<script>
  import Sheet from "./Sheet.svelte";
  import Tabs from "./Tabs.svelte";
  import Expandable from "./Expandable.svelte";
  import Switch from "./Switch.svelte";

  import { onMount } from "svelte";
  export let vscode;
  export const isDarkTheme = true;

  let loading = true;
  let stats = {};
  let state = {
    infoOpen: false,
  };
  let build_config = {
    is_ts: false,
    is_scss: false,
    minify: false,
  };
  let page = vscode.getState()?.page || "todos";

  $: {
    vscode.setState({ page });
  }

  function checkFolders() {
    vscode.postMessage({ type: "get-stats", value: undefined });
  }

  function startWatch() {
    vscode.postMessage({ type: "start-watch", value: undefined });
  }
  
  function createFolder(folder) {
    vscode.postMessage({ type: "create-folder", value: undefined });
  }

  onMount(async () => {
    window.addEventListener("message", async (event) => {
      console.log("webview message ", event.data.stats);
      const message = event.data;
      switch (message.type) {
        case "stats":
          stats = message.stats;
          loading = false;
          break;
        case "building-state":
          stats = {
            ...stats,
            templates: {
              ...(stats.templates || {}),
              [message.data.template]: {
                ...(stats.templates[message.data.template] || {}),
                loading: message.data.loading,
              },
            },
          };
          // templates[message.state.template] = message.state.loading;
          console.log("building state webview", message);
          break;
      }
    });
    checkFolders();
  });

  $: buildLoading =
    stats &&
    stats.templates &&
    Object.keys(stats.templates).some((key) => stats.templates[key].loading);

  $: console.log(build_config);
</script>

<div class="container">
  <header>
    <div class="flex between vertical-center w-100">
      <div class="">
        <h1>Liquivelte Extension</h1>
      </div>
      <div class="right">
        <svg
          on:click={() => (stats = { ...stats, infoOpen: !stats.infoOpen })}
          class="icon info pointer"
          width="25"
          height="25"
          viewBox="0 0 24 24"
          ><path
            d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z"
          /></svg
        >
      </div>
    </div>
  </header>
  <div class="relative">
    <Sheet class="sheet" bind:open={stats.infoOpen}>
      <div>
        <div class="block">
          <p>
            This plugin is for developing Shopify themes with Svelte components.
            It carries out a build process in the background therefore will
            change your theme files. Please do not try to use it with themes
            that you don't do git or have a backup.
          </p>
        </div>
      </div>
      <div slot="close">
        <a href="#">I understand</a>
      </div>
    </Sheet>
  </div>
  <Tabs>
    <span slot="button1">
      <a href="#">
        <svg class="icon" viewBox="0 0 24 24"
          ><path
            d="M7 22h2v2H7v-2m4 0h2v2h-2v-2m4 0h2v2h-2v-2M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 4v10h14V8H5"
          /></svg
        >
        General
      </a>
    </span>
    <span slot="button2">
      <a href="#">
        <svg class="icon" viewBox="0 0 24 24"
          ><path
            d="M13 9V3.5L18.5 9M6 2c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z"
          /></svg
        >
        File
      </a>
    </span>
    <span slot="button3">
      <a href="#">
        <svg class="icon" viewBox="0 0 24 24"
          ><path
            d="M14 12h-4v-2h4m0 6h-4v-2h4m6-6h-2.81a5.985 5.985 0 0 0-1.82-1.96L17 4.41 15.59 3l-2.17 2.17a6.002 6.002 0 0 0-2.83 0L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z"
          /></svg
        >
        Issues
      </a>
    </span>
    <span slot="tab1">
      {#if loading}
        <progress class="progress" />
      {:else}
        <!-- not loading -->
        {#if stats.configFile}
          <!-- no config file -->
          {#if stats.presetsSame}
            {#if stats.themeFolder}
              {#if stats.validTheme}
                <div class="block">
                  <svg class="icon check-circle" viewBox="0 0 24 24"
                    ><path
                      d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    /></svg
                  >
                  <b>Theme</b> folder found.
                </div>
              {:else}
                <div>
                  <svg
                    class="icon blockicon"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="#000000"
                    ><path d="M0 0h24v24H0V0z" fill="none" /><path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
                    /></svg
                  >
                  <span
                    >Theme folder specified but doesn't seem like a theme:</span
                  >
                  <b>{stats.themeFolder}</b>
                  <button on:click={checkFolders}>Check again</button>
                </div>
              {/if}
            {:else}
              <div class="container">
                <p>
                  <svg
                    class="icon blockicon"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="#000000"
                    ><path d="M0 0h24v24H0V0z" fill="none" /><path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
                    /></svg
                  >
                  <span
                    >Theme folder specified but doesn't seem like a theme
                  </span>
                </p>
                <div class="block">
                  <button>Initialize it for me</button>
                </div>
              </div>
              <div class="container">
                <button on:click={checkFolders}>Check again</button>
              </div>
            {/if}
          {:else}
            <div class="container">
              <svg
                class="icon blockicon"
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="#000000"
                ><path d="M0 0h24v24H0V0z" fill="none" /><path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
                /></svg
              >
              Config presets specify different folders for theme.
              <button on:click={checkFolders}>Check again</button>
            </div>
          {/if}
        {:else}
          <div class="container">
            You dont have a <b>config.yml</b> in the root.
            <button>Create one for me</button>
          </div>
        {/if}
        {#if stats.srcFolder}
          <div>
            <svg class="icon check-circle" viewBox="0 0 24 24"
              ><path
                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              /></svg
            >
            <b>Src</b> folder found
          </div>
        {:else}
          <div>
            <svg
              class="icon blockicon"
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="#000000"
              ><path d="M0 0h24v24H0V0z" fill="none" /><path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
              /></svg
            >
            Theme folder specified but doesn't seem like a theme: Src folder not
            found
          </div>
        {/if}
        {#if stats.validTheme}
          <div class="block">
            <button
              on:click={() =>
                vscode.postMessage({
                  type: "regenerate-theme",
                  value: undefined,
                })}
            >
              Start Watching
            </button>
          </div>
          <div class="block">
            <button
              on:click={() =>
                !buildLoading &&
                vscode.postMessage({
                  type: "regenerate-theme",
                  value: undefined,
                })}
            >
              {#if buildLoading}
                <span class="spinner" />
              {:else}
                Regenerate
              {/if}
            </button>
          </div>
          <hr />
          <div class="block">
            <Expandable>
              <h3 slot="opener">
                <svg
                  class="icon template"
                  xmlns="http://www.w3.org/2000/svg"
                  enable-background="new 0 0 24 24"
                  viewBox="0 0 24 24"
                  ><g
                    ><rect fill="none" height="24" width="24" /><rect
                      fill="none"
                      height="24"
                      width="24"
                    /><rect fill="none" height="24" width="24" /></g
                  ><g
                    ><g /><path
                      d="M20,4H4C2.9,4,2.01,4.9,2.01,6L2,18c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M4,9h10.5v3.5H4V9z M4,14.5 h10.5V18L4,18V14.5z M20,18l-3.5,0V9H20V18z"
                    /></g
                  ></svg
                >
                Templates
                {#if buildLoading}
                  <span class="spinner" />
                {/if}
              </h3>
              <ul class="templates-list">
                {#each Object.keys(stats.templates) as template}
                  <li>
                    <svg
                      class="icon icon-file"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      ><path d="M0 0h24v24H0V0z" fill="none" /><path
                        d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
                      /></svg
                    >
                    {template}
                    {#if stats.templates[template].includes.length}
                      {#if stats.templates[template].loading}
                        <div class="spinner" />
                      {:else}
                        <div class="chip">has liquivelte</div>
                      {/if}
                    {/if}
                  </li>
                {/each}
              </ul>
            </Expandable>
          </div>
        {/if}
        <Expandable>
          <h3 slot="opener">
            <svg
              class="icon build"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              ><path d="M0 0h24v24H0V0z" fill="none" /><path
                d="M22.61 18.99l-9.08-9.08c.93-2.34.45-5.1-1.44-7C9.79.61 6.21.4 3.66 2.26L7.5 6.11 6.08 7.52 2.25 3.69C.39 6.23.6 9.82 2.9 12.11c1.86 1.86 4.57 2.35 6.89 1.48l9.11 9.11c.39.39 1.02.39 1.41 0l2.3-2.3c.4-.38.4-1.01 0-1.41zm-3 1.6l-9.46-9.46c-.61.45-1.29.72-2 .82-1.36.2-2.79-.21-3.83-1.25C3.37 9.76 2.93 8.5 3 7.26l3.09 3.09 4.24-4.24-3.09-3.09c1.24-.07 2.49.37 3.44 1.31 1.08 1.08 1.49 2.57 1.24 3.96-.12.71-.42 1.37-.88 1.96l9.45 9.45-.88.89z"
              /></svg
            >
            Build Options
          </h3>
          <ul class="build-tools">
            <li class="build-option">
              <Switch
                bind:value={build_config.is_ts}
                label="Use Typescript"
                design="inner"
              >
                <span slot="on">
                  <svg
                    class="build-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="TypeScript"
                    role="img"
                    viewBox="0 0 512 512"
                    ><rect
                      width="512"
                      height="512"
                      rx="15%"
                      fill="#3178c6"
                    /><path
                      fill="#fff"
                      d="m233 284h64v-41H118v41h64v183h51zm84 173c8.1 4.2 18 7.3 29 9.4s23 3.1 35 3.1c12 0 23-1.1 34-3.4c11-2.3 20-6.1 28-11c8.1-5.3 15-12 19-21s7.1-19 7.1-32c0-9.1-1.4-17-4.1-24s-6.6-13-12-18c-5.1-5.3-11-10-18-14s-15-8.2-24-12c-6.6-2.7-12-5.3-18-7.9c-5.2-2.6-9.7-5.2-13-7.8c-3.7-2.7-6.5-5.5-8.5-8.4c-2-3-3-6.3-3-10c0-3.4.89-6.5 2.7-9.3s4.3-5.1 7.5-7.1c3.2-2 7.2-3.5 12-4.6c4.7-1.1 9.9-1.6 16-1.6c4.2 0 8.6.31 13 .94c4.6.63 9.3 1.6 14 2.9c4.7 1.3 9.3 2.9 14 4.9c4.4 2 8.5 4.3 12 6.9v-47c-7.6-2.9-16-5.1-25-6.5s-19-2.1-31-2.1c-12 0-23 1.3-34 3.8s-20 6.5-28 12c-8.1 5.4-14 12-19 21c-4.7 8.4-7 18-7 30c0 15 4.3 28 13 38c8.6 11 22 19 39 27c6.9 2.8 13 5.6 19 8.3s11 5.5 15 8.4c4.3 2.9 7.7 6.1 10 9.5c2.5 3.4 3.8 7.4 3.8 12c0 3.2-.78 6.2-2.3 9s-3.9 5.2-7.1 7.2s-7.1 3.6-12 4.8c-4.7 1.1-10 1.7-17 1.7c-11 0-22-1.9-32-5.7c-11-3.8-21-9.5-28.1-15.44z"
                    /></svg
                  >
                </span>
                <span slot="off">
                  <svg
                    class="build-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g fill="none" fill-rule="evenodd">
                      <rect width="24" height="24" fill="#F1DC50" />
                      <path
                        stroke="#333"
                        stroke-width="2"
                        d="M12,11 C12,15.749205 12,18.4158717 12,19 C12,19.8761925 11.4771235,21 10,21 C7.61461794,21 7.5,19 7.5,19 M20.7899648,13.51604 C20.1898831,12.5053467 19.3944074,12 18.4035378,12 C16.8563489,12 16,13 16,14 C16,15 16.5,16 18.5084196,16.5 C19.7864643,16.8181718 21,17.5 21,19 C21,20.5 19.6845401,21 18.5,21 C16.9861609,21 15.9861609,20.3333333 15.5,19"
                      />
                    </g>
                  </svg>
                </span>
              </Switch>
            </li>
            <li class="build-option">
              <Switch
                bind:value={build_config.is_scss}
                label="Use SCSS"
                design="inner"
              >
                <span slot="on">
                  <svg
                    class="build-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Sass"
                    role="img"
                    viewBox="0 0 512 512"
                    ><rect width="512" height="512" rx="15%" fill="#c69" /><path
                      d="M258,88c-96,33-158,100-152,140s66,72,93,93h0c-35,18-79,45-78,80,2,48,54,33,76,19s44-53,30-94c31-8,58,2,66,8,31,22,15,47,4,51s-4,6,3,4,22-12,22-29c0-43-46-63-103-48-33-35-78-51-76-89,1-14,6-50,95-95s152-27,144,14c-12,62-120,104-158,68-2-4-9-7-5,4,20,50,182,27,189-79C410,79,329,64,258,88ZM172,408c-25,8-24-8-23-14,3-17,17-38,59-59C220,373,193,402,172,408Z"
                      fill="#fff"
                    /></svg
                  >
                </span>
                <span slot="off">
                  <svg
                    class="build-icon"
                    viewBox="-52.5 0 361 361"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    preserveAspectRatio="xMidYMid"
                  >
                    <g>
                      <path
                        d="M127.843868,360.087912 L23.6617143,331.166242 L0.445186813,70.7657143 L255.554813,70.7657143 L232.31367,331.125451 L127.843868,360.087912 L127.843868,360.087912 Z"
                        fill="#264DE4"
                      />
                      <path
                        d="M212.416703,314.546637 L232.277802,92.0573187 L128,92.0573187 L128,337.950242 L212.416703,314.546637 L212.416703,314.546637 Z"
                        fill="#2965F1"
                      />
                      <path
                        d="M53.6685714,188.636132 L56.530989,220.572835 L128,220.572835 L128,188.636132 L53.6685714,188.636132 L53.6685714,188.636132 Z"
                        fill="#EBEBEB"
                      />
                      <path
                        d="M47.917011,123.994725 L50.8202198,155.932132 L128,155.932132 L128,123.994725 L47.917011,123.994725 L47.917011,123.994725 Z"
                        fill="#EBEBEB"
                      />
                      <path
                        d="M128,271.580132 L127.860044,271.617407 L92.2915165,262.013187 L90.0177582,236.54189 L57.957978,236.54189 L62.4323516,286.687648 L127.853011,304.848879 L128,304.808088 L128,271.580132 L128,271.580132 Z"
                        fill="#EBEBEB"
                      />
                      <path
                        d="M60.4835165,0 L99.1648352,0 L99.1648352,16.1758242 L76.6593407,16.1758242 L76.6593407,32.3516484 L99.1648352,32.3516484 L99.1648352,48.5274725 L60.4835165,48.5274725 L60.4835165,0 L60.4835165,0 Z"
                        fill="#000000"
                      />
                      <path
                        d="M106.901099,0 L145.582418,0 L145.582418,14.0659341 L123.076923,14.0659341 L123.076923,16.8791209 L145.582418,16.8791209 L145.582418,49.2307692 L106.901099,49.2307692 L106.901099,34.4615385 L129.406593,34.4615385 L129.406593,31.6483516 L106.901099,31.6483516 L106.901099,0 L106.901099,0 Z"
                        fill="#000000"
                      />
                      <path
                        d="M153.318681,0 L192,0 L192,14.0659341 L169.494505,14.0659341 L169.494505,16.8791209 L192,16.8791209 L192,49.2307692 L153.318681,49.2307692 L153.318681,34.4615385 L175.824176,34.4615385 L175.824176,31.6483516 L153.318681,31.6483516 L153.318681,0 L153.318681,0 Z"
                        fill="#000000"
                      />
                      <path
                        d="M202.126769,188.636132 L207.892396,123.994725 L127.889582,123.994725 L127.889582,155.932132 L172.892132,155.932132 L169.98611,188.636132 L127.889582,188.636132 L127.889582,220.572835 L167.216527,220.572835 L163.509451,261.992791 L127.889582,271.606857 L127.889582,304.833407 L193.362286,286.687648 L193.842637,281.291956 L201.347516,197.212132 L202.126769,188.636132 L202.126769,188.636132 Z"
                        fill="#FFFFFF"
                      />
                    </g>
                  </svg>
                </span>
              </Switch>
            </li>
            <li class="build-option">
              <Switch
                bind:value={build_config.minify}
                label="Minify"
                design="inner"
              >
                <span slot="on">
                  <svg
                    class="build-icon"
                    viewBox="0 -177.5 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    preserveAspectRatio="xMidYMid"
                  >
                    <g>
                      <rect
                        fill="#FF6B00"
                        x="7.96444444"
                        y="0"
                        width="26.7377778"
                        height="58.0266667"
                      />
                      <path
                        d="M7.96444444,84.7644444 L7.96444444,128.568889 C7.96444444,148.48 23.3244444,155.875556 34.7022222,155.875556 L47.7866667,155.875556 L47.7866667,128.568889 L34.7022222,128.568889 L34.7022222,84.7644444 L7.96444444,84.7644444 Z"
                        fill="#FF6B00"
                      />
                      <polygon
                        fill="#05CE7C"
                        points="0 58.0266667 10.3621788 58.0266667 10.3621788 84.7644444 0 84.7644444"
                      />
                      <polygon
                        fill="#05CE7C"
                        points="33.1174392 58.0266667 47.7866667 58.0266667 47.7866667 84.7644444 33.1174392 84.7644444"
                      />
                      <rect
                        fill="#055600"
                        x="7.96444444"
                        y="58.0266667"
                        width="26.7377778"
                        height="26.7377778"
                      />
                      <path
                        d="M133.12,111.502222 L160.426667,100.124444 C156.728889,91.3635556 153.031111,83.0577778 149.617778,78.5066667 L122.88,89.8844444 L133.12,111.502222 Z"
                        fill="#DA1800"
                      />
                      <path
                        d="M98.9866667,125.155556 L89.3155556,103.537778 L61.44,114.915556 C63.5448889,123.619556 67.1288889,131.527111 71.68,137.102222 L98.9866667,125.155556 Z"
                        fill="#DA1800"
                      />
                      <path
                        d="M122.88,89.8844444 L149.617778,78.5066667 C120.604444,37.5466667 54.6133333,61.44 61.44,114.915556 L89.3155556,103.537778 C91.9324444,86.0728889 110.364444,79.3031111 122.88,89.8844444 Z"
                        fill="#FF6B00"
                      />
                      <path
                        d="M89.3155556,103.537778 C88.9460022,107.997055 89.3553229,111.741476 90.5250351,114.946624 C92.0562978,119.142462 94.8906631,122.414136 98.9866667,125.155556 L133.12,111.502222 C131.356444,103.082667 128.625778,95.8577778 122.88,89.8844444 L89.3155556,103.537778 Z"
                        fill="#DA3AB3"
                      />
                      <path
                        d="M71.68,137.102222 C91.8186667,161.962667 127.431111,161.564444 150.186667,140.515556 L133.12,119.466667 C124.586667,129.137778 106.951111,130.844444 98.9866667,125.155556"
                        fill="#FF6B00"
                      />
                      <polygon
                        fill="#DA3AB3"
                        points="200.817778 59.1644444 200.817778 58.0266667 174.08 58.0266667 174.08 92.16"
                      />
                      <path
                        d="M200.817778,59.1644444 L198.706298,62.2387044 L199.404653,91.1771571 L200.817778,92.16 C203.491556,84.5368889 211.285333,82.432 216.746667,87.6088889 L236.088889,68.2666667 C225.393778,58.1404444 212.252444,55.9786667 200.817778,59.1644444 Z"
                        fill="#00B3E3"
                      />
                      <path
                        d="M200.817778,59.1644444 C186.766222,63.0897778 175.331556,75.3777778 174.08,92.16 L174.08,155.875556 L200.817778,155.875556 L200.817778,59.1644444 Z"
                        fill="#00299F"
                      />
                      <path
                        d="M315.733333,58.0266667 L273.066667,58.0266667 C234.837333,64.9102222 238.535111,119.239111 277.048889,120.035556 L293.546667,120.035556 C299.349333,120.035556 299.349333,129.137778 293.546667,129.137778 L254.862222,129.137778 L254.862222,155.875556 L293.546667,155.875556 C314.254222,153.827556 324.039111,140.686222 324.266667,125.724444 C324.494222,109.397333 312.718222,93.2977778 292.977778,93.2977778 L275.911111,93.2977778 C272.156444,91.9893333 272.156444,86.2435556 275.911111,84.7644444 L315.733333,84.7644444 L315.733333,58.0266667 Z"
                        fill="#FF4338"
                      />
                      <path
                        d="M409.031111,111.502222 L436.337778,100.124444 C432.64,91.3635556 428.942222,83.0577778 425.528889,78.5066667 L398.791111,89.8844444 L409.031111,111.502222 Z"
                        fill="#DA1800"
                      />
                      <path
                        d="M374.897778,125.155556 L365.226667,103.537778 L337.351111,114.915556 C339.456,123.619556 343.04,131.527111 347.591111,137.102222 L374.897778,125.155556 Z"
                        fill="#DA1800"
                      />
                      <path
                        d="M398.791111,89.8844444 L425.528889,78.5066667 C396.515556,37.5466667 330.524444,61.44 337.351111,114.915556 L365.226667,103.537778 C367.843556,86.0728889 386.275556,79.3031111 398.791111,89.8844444 Z"
                        fill="#FF6B00"
                      />
                      <path
                        d="M365.226667,103.537778 C364.373333,113.834667 367.672889,120.32 374.897778,125.155556 L409.031111,111.502222 C407.267556,103.082667 404.536889,95.8577778 398.791111,89.8844444 L365.226667,103.537778 Z"
                        fill="#DA3AB3"
                      />
                      <path
                        d="M347.591111,137.102222 C367.729778,161.962667 403.342222,161.564444 426.097778,140.515556 L409.031111,119.466667 C400.497778,129.137778 382.862222,130.844444 374.897778,125.155556"
                        fill="#FF6B00"
                      />
                      <polygon
                        fill="#DA3AB3"
                        points="476.728889 59.1644444 476.728889 58.0266667 449.991111 58.0266667 449.991111 92.16"
                      />
                      <path
                        d="M476.728889,59.1644444 L476.024353,60.500593 L476.024353,91.252704 L476.728889,92.16 C479.402667,84.5368889 487.196444,82.432 492.657778,87.6088889 L512,68.2666667 C501.304889,58.1404444 488.163556,55.9786667 476.728889,59.1644444 Z"
                        fill="#00B3E3"
                      />
                      <path
                        d="M476.728889,59.1644444 C462.677333,63.0897778 451.242667,75.3777778 449.991111,92.16 L449.991111,155.875556 L476.728889,155.875556 L476.728889,59.1644444 Z"
                        fill="#00299F"
                      />
                    </g>
                  </svg>
                </span>
                <span slot="off">
                  <svg
                    class="build-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 512 512"
                    style="enable-background:new 0 0 512 512;"
                    xml:space="preserve"
                  >
                    <rect x="64" width="384" height="512" />
                    <path
                      style="fill:#5B5C5F;"
                      d="M441,505.032H71V6.976h370V505.032z M75,501.032h362V10.976H75V501.032z"
                    />
                    <rect
                      x="255.984"
                      y="232.24"
                      style="fill:#FFFFFF;"
                      width="51.864"
                      height="12"
                    />
                    <g>
                      <rect
                        x="134.984"
                        y="232.24"
                        style="fill:#C1C1C1;"
                        width="69.144"
                        height="12"
                      />
                      <rect
                        x="134.984"
                        y="163.12"
                        style="fill:#C1C1C1;"
                        width="69.144"
                        height="12"
                      />
                    </g>
                    <rect
                      x="238.712"
                      y="163.12"
                      style="fill:#6B6B6B;"
                      width="69.152"
                      height="12"
                    />
                    <g>
                      <rect
                        x="325.152"
                        y="163.12"
                        style="fill:#C1C1C1;"
                        width="69.152"
                        height="12"
                      />
                      <rect
                        x="377.04"
                        y="197.696"
                        style="fill:#C1C1C1;"
                        width="34.568"
                        height="12"
                      />
                      <rect
                        x="290.56"
                        y="197.696"
                        style="fill:#C1C1C1;"
                        width="34.576"
                        height="12"
                      />
                    </g>
                    <g>
                      <rect
                        x="154.576"
                        y="197.696"
                        style="fill:#FFFFFF;"
                        width="65"
                        height="12"
                      />
                      <rect
                        x="377.04"
                        y="128.56"
                        style="fill:#FFFFFF;"
                        width="34.568"
                        height="12"
                      />
                    </g>
                    <rect
                      x="290.56"
                      y="128.56"
                      style="fill:#C1C1C1;"
                      width="34.576"
                      height="12"
                    />
                    <rect
                      x="134.984"
                      y="128.56"
                      style="fill:#FFFFFF;"
                      width="103.72"
                      height="12"
                    />
                    <rect
                      x="325.152"
                      y="59.4"
                      style="fill:#6B6B6B;"
                      width="86.432"
                      height="12"
                    />
                    <rect
                      x="255.984"
                      y="59.4"
                      style="fill:#FFFFFF;"
                      width="34.584"
                      height="12"
                    />
                    <g>
                      <rect
                        x="117.696"
                        y="59.4"
                        style="fill:#C1C1C1;"
                        width="103.72"
                        height="12"
                      />
                      <rect
                        x="342.432"
                        y="93.976"
                        style="fill:#C1C1C1;"
                        width="69.152"
                        height="12"
                      />
                      <rect
                        x="273.28"
                        y="93.976"
                        style="fill:#C1C1C1;"
                        width="34.576"
                        height="12"
                      />
                    </g>
                    <rect
                      x="100.424"
                      y="93.976"
                      style="fill:#6B6B6B;"
                      width="103.704"
                      height="12"
                    />
                    <rect
                      x="255.984"
                      y="440.64"
                      style="fill:#FFFFFF;"
                      width="51.864"
                      height="12"
                    />
                    <g>
                      <rect
                        x="134.984"
                        y="440.64"
                        style="fill:#C1C1C1;"
                        width="69.144"
                        height="12"
                      />
                      <rect
                        x="134.984"
                        y="371.44"
                        style="fill:#C1C1C1;"
                        width="69.144"
                        height="12"
                      />
                    </g>
                    <rect
                      x="238.712"
                      y="371.44"
                      style="fill:#6B6B6B;"
                      width="69.152"
                      height="12"
                    />
                    <g>
                      <rect
                        x="325.152"
                        y="371.44"
                        style="fill:#C1C1C1;"
                        width="69.152"
                        height="12"
                      />
                      <rect
                        x="377.04"
                        y="406.024"
                        style="fill:#C1C1C1;"
                        width="34.568"
                        height="12"
                      />
                      <rect
                        x="290.56"
                        y="406.024"
                        style="fill:#C1C1C1;"
                        width="34.576"
                        height="12"
                      />
                    </g>
                    <g>
                      <rect
                        x="154.576"
                        y="406.024"
                        style="fill:#FFFFFF;"
                        width="65"
                        height="12"
                      />
                      <rect
                        x="377.04"
                        y="336.88"
                        style="fill:#FFFFFF;"
                        width="34.568"
                        height="12"
                      />
                    </g>
                    <rect
                      x="290.56"
                      y="336.88"
                      style="fill:#C1C1C1;"
                      width="34.576"
                      height="12"
                    />
                    <rect
                      x="134.984"
                      y="336.88"
                      style="fill:#FFFFFF;"
                      width="103.72"
                      height="12"
                    />
                    <rect
                      x="325.152"
                      y="267.736"
                      style="fill:#6B6B6B;"
                      width="86.432"
                      height="12"
                    />
                    <rect
                      x="255.984"
                      y="267.736"
                      style="fill:#FFFFFF;"
                      width="34.584"
                      height="12"
                    />
                    <g>
                      <rect
                        x="117.696"
                        y="267.736"
                        style="fill:#C1C1C1;"
                        width="103.72"
                        height="12"
                      />
                      <rect
                        x="342.432"
                        y="302.304"
                        style="fill:#C1C1C1;"
                        width="69.152"
                        height="12"
                      />
                      <rect
                        x="273.28"
                        y="302.304"
                        style="fill:#C1C1C1;"
                        width="34.576"
                        height="12"
                      />
                    </g>
                    <rect
                      x="100.424"
                      y="302.304"
                      style="fill:#6B6B6B;"
                      width="103.704"
                      height="12"
                    />
                  </svg>
                </span>
              </Switch>
            </li>
          </ul>
        </Expandable>
        <!-- not loading -->
      {/if}
    </span>
  </Tabs>
</div>

<style>
  .flex {
    display: flex;
  }
  .flex > * {
    flex: 1 1 auto;
  }
  .relative {
    position: relative;
  }

  progress {
    width: 100%;
  }

  .container {
    padding: 1em 0.2em;
  }
  .icon {
    color: var(--vscode-foreground);
    fill: currentColor;
    width: 1.5em;
    height: 1.5em;
    margin-bottom: -0.2em;
    flex: 0 0 auto;
  }

  .block {
    margin: 1em 0.2em;
  }

  ul.templates-list {
    overflow-y: scroll;
    overflow-x: scroll;
  }
  .templates-list li > * {
    margin: 0 0.3em;
  }
  li {
    list-style: none;
    margin: 0.5em 0;
    display: flex;
    justify-content: flex-start;
  }

  h1,
  h3 {
    margin: 0.4em 0;
  }
  .chip {
    border: 1px solid var(--vscode-foreground);
    border-radius: 10px;
    padding: 0.1em 0.5em;
    white-space: nowrap;
  }

  .vertical-center {
    align-items: center;
  }

  .left,
  .right {
    flex: 0 1 auto;
  }

  .w-100 {
    width: 100%;
  }

  .pointer {
    cursor: pointer;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    margin: 0 0.2em;
    border: 2px solid var(--vscode-foreground);
    border-radius: 50%;
    border-top-color: var(--vscode-foreground);
    border-left-color: transparent;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .build-icon {
    width: 3em;
    height: 3em;
    margin-bottom: -0.2em;
    flex: 0 0 auto;
  }
</style>
