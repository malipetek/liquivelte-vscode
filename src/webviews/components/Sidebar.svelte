<script>
  import Sheet from "./Sheet.svelte";
  import Tabs from "./Tabs.svelte";
  import Expandable from "./Expandable.svelte";
  import Switch from "./Switch.svelte";
  import Filelink from "./Filelink.svelte";
  import JSONTree from "svelte-json-tree";
  import Schema from "./schema/Schema.svelte";
  import { slide } from "svelte/transition";
  import { addDefaultEmptySettingsFields } from '../utils/settings.js';

  import { onMount } from "svelte";
  import { setContext } from "svelte";
  import {
    schema,
    schemaFromFile,
    sectionTranslations,
    sectionTranslationsFromFile,
    schemaChanges,
    hasSchema,
  } from "./store.js";

  export let vscode;
  export const isDarkTheme = true;

  setContext("vscode", vscode);
  function wait (ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  let loading = true;
  let stats = {};
  let currentFile = "";
  let state = {
    infoOpen: false,
  };
  let translations = {};

  let watching = false;

  let build_config = {
    is_ts: false,
    is_scss: false,
    minify: false,
  };
  let build_warnings = [];
  let build_errors = [];

  let schema_error;
  // $: console.log("schemaChanges ", $schemaChanges);

  let page = vscode.getState()?.page || "todos";

  $: {
    vscode.setState({ page });
  }

  function checkFolders() {
    vscode.postMessage({ type: "get-stats", value: undefined });
  }

  function getTranslations() {
    vscode.postMessage({ type: "get-translations", value: undefined });
  }

  function startWatch() {
    vscode.postMessage({ type: "start-watch", value: undefined });
  }

  function createFolder(folder) {
    vscode.postMessage({ type: "create-folder", folder: folder });
  }

  function createFile(file) {
    vscode.postMessage({ type: "create-file", file: file });
  }

  function saveSchema() {
    debouncingForMore = false;
    vscode.postMessage({
      type: "save-schema",
      file: currentFile,
      schema: addDefaultEmptySettingsFields({...$schema}),
    });
    schemaFromFile.set(JSON.parse(JSON.stringify($schema)));
    saveTranslations();
  }
  function discardChanges() {
    $schema = JSON.parse(JSON.stringify(schemaFromFile));
    $schemaChanges = false;
  }

  function saveTranslations() {
    vscode.postMessage({
      type: "save-translations",
      sectionTranslations: $sectionTranslations,
    });
    sectionTranslationsFromFile.set(
      JSON.parse(JSON.stringify($sectionTranslations))
    );
  }
  function cloneTheme() {
    vscode.postMessage({ type: "clone-theme", value: undefined });
  }
  onMount(async () => {
    window.addEventListener("message", async (event) => {
      console.log("webview message ", event.data);
      const message = event.data;
      switch (message.type) {
        case "stats":
          stats = message.stats;
          watching = message.stats.watching;
          if (Object.keys(message.stats.buildConfig).length) {
            build_config = message.stats.buildConfig;
          }
          loading = false;
          break;
        case "watch-state":
          watching = message.watching;
          break;
        case "active-file-changed":
          currentFile = message.data;
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
          break;
        case "translations": {
          // translations = message.translations;
          sectionTranslations.set(message.sectionTranslations);
          sectionTranslationsFromFile.set(
            JSON.parse(JSON.stringify(message.sectionTranslations))
          );
        }
        case "build-warnings":
          build_warnings = message.data;
          break;
        case "build-errors":
          console.log('build errors came');
          build_errors = message.data.filter(err => !err.frame || !err.frame.startsWith('This is not a real error'));
          break;
        case "schema-changed":
          if (message.data) {
            if(debouncingForMore) {
              break;
            }
            schema.set(addDefaultEmptySettingsFields(JSON.parse(JSON.stringify(message.data))));
            schemaFromFile.set(addDefaultEmptySettingsFields(JSON.parse(JSON.stringify(message.data))));
            hasSchema.set(true);
          } else {
            // no schema on this file
            hasSchema.set(false);
            schema.set({});
            schemaFromFile.set({});
          }
          break;
        case "schema-error":
          schema_error = message.data;
          break;
      }
    });
    checkFolders();
    getTranslations();
  });

  $: buildLoading =
    stats &&
    stats.templates &&
    Object.keys(stats.templates).some((key) => stats.templates[key].loading);

  let initial_build_config = true;

  $: if (build_config) {
    if (!initial_build_config) {
      vscode.postMessage({
        type: "set-build-config",
        buildConfig: build_config,
      });
    }
    initial_build_config = false;
  }

  function debounce(fn, delay) {
    let timer;
    return (() => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), delay);
    })();
  }
  let debouncingForMore = false;
  $: if ($schemaChanges && watching) {
    debouncingForMore = true;
    debounce(saveSchema, 3000);
  }

  $: console.log('debouncingForMore ', debouncingForMore);

  const escapeHtml = (unsafe) => {
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  let build_warnings_by_file = {};
  $: if(build_warnings) {
    build_warnings_by_file = {};
    build_warnings.forEach((warning) => {
      if (!build_warnings_by_file[warning.filename]) {
        build_warnings_by_file[warning.filename] = {};
      }
      if (!build_warnings_by_file[warning.filename][warning.pos]) {
        build_warnings_by_file[warning.filename][warning.pos] = warning;
      }
    });
  }

  let build_errors_by_file = {};
  $: if(build_errors) {
    build_errors_by_file = {};
    build_errors.forEach((error) => {
      if (!build_errors_by_file[error.filename]) {
        build_errors_by_file[error.filename] = {};
      }
      if (!build_errors_by_file[error.filename][error.pos]) {
        build_errors_by_file[error.filename][error.pos] = error;
      }
    });
  }
</script>

<div class="container">
  <header>
    <div class="flex between vertical-center w-100">
      <div class="">
        <h1>Liquivelte</h1>
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
      {#if buildLoading}
        <span class="spinner" />
      {:else}
        <a href="#">
          <svg class="icon" viewBox="0 0 24 24"
            ><path
              d="M7 22h2v2H7v-2m4 0h2v2h-2v-2m4 0h2v2h-2v-2M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 4v10h14V8H5"
            /></svg
          >
          General
        </a>
      {/if}
    </span>
    <span slot="button2">
      <a href="#" class="relative">
        <svg class="icon" viewBox="0 0 24 24"
          ><path
            d="M13 9V3.5L18.5 9M6 2c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z"
          /></svg
        >
        Schema
        {#if $schemaChanges}
          <div class="badge">&nbsp;&nbsp;&nbsp;&nbsp;</div>
        {/if}
      </a>
    </span>
    <span slot="button3">
      <a href="#" class="relative">
        <svg class="icon" viewBox="0 0 24 24"
          ><path
            d="M14 12h-4v-2h4m0 6h-4v-2h4m6-6h-2.81a5.985 5.985 0 0 0-1.82-1.96L17 4.41 15.59 3l-2.17 2.17a6.002 6.002 0 0 0-2.83 0L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z"
          /></svg
        >
        Issues
        {#if (build_warnings && build_warnings.length > 0) }
          <div class="badge" color="yellow">
            {build_warnings?.length || 0 }
          </div>
        {/if}
        {#if (build_errors && build_errors.length > 0) }
          <div class="badge" color="red">
            {build_errors?.length || 0}
          </div>
        {/if}
      </a>
    </span>
    <div slot="under-buttons">
      {#if $schemaChanges && !watching}
        <div class="schema-changes" transition:slide>
          <p>Schema or translation changes are made</p>
          <div class="schema-changes-actions">
            <button on:click={saveSchema}> Save </button>
            <button on:click={discardChanges} secondary> Discard </button>
          </div>
        </div>
      {/if}
    </div>
    <span slot="tab1">
      {#if loading}
        <progress class="progress" />
      {:else}
        <!-- not loading -->
        {#if stats.presetsSame}
          {#if stats.themeFolder}
            {#if stats.validTheme}
              <div class="block">
                <svg class="icon check-circle" viewBox="0 0 24 24"
                  ><path
                    d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                  /></svg>
                <Filelink folder={true} href={stats.themeFolder}>
                  <b>Theme</b>
                </Filelink> folder found.
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
                <span>Theme folder specified but doesn't seem like a theme:</span>
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
                  >Theme folder specified but it doesn't seem like a theme
                </span>
              </p>
              <div class="block">
                <button on:click={cloneTheme}>Initialize it for me</button>
              </div>
            </div>
            <div class="container">
              <button on:click={checkFolders}>Check again</button>
            </div>
          {/if}
        {:else}
          <div class="container" box>
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
          <div box>
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
              Src folder not found</p>
            <button on:click={async () => {
              createFolder('src');
              await wait(300);
              createFolder('src/snippets');
              await wait(300);
              createFolder('src/sections');
              await wait(700);
              createFile('src/sections/example-product.liquivelte');
              await wait(700);
              createFile('src/liquivelte-liquid.js');
              checkFolders();
            }}> Create one for me </button>
          </div>
        {/if}
        {#if stats.validTheme}
          <div class="block">
            {#if !watching}
              <button
                on:click={() =>
                  vscode.postMessage({
                    type: "start-watch",
                    value: undefined,
                  })}
              >
                Start Watching
              </button>
            {:else}
              <button
                class="btn-watching"
                on:click={() =>
                  vscode.postMessage({
                    type: "end-watch",
                    value: undefined,
                  })}
              >
                Stop Watching
              </button>
            {/if}
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
                Layouts
                {#if buildLoading}
                  <span class="spinner" />
                {/if}
              </h3>
              <ul class="templates-list">
                {#each Object.keys(stats.layouts) as layout}
                  <li>
                    <svg
                      class="icon icon-file"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      ><path d="M0 0h24v24H0V0z" fill="none" /><path
                        d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
                      /></svg
                    >
                    <Filelink href="{stats.themeFolder}/layout/{layout}">
                      {layout}
                    </Filelink>
                    {#if stats.layouts[layout].hasIncludes}
                      {#if stats.layouts[layout].loading}
                        <div class="spinner" />
                      {:else}
                        <div class="chip">has liquivelte</div>
                      {/if}
                    {/if}
                  </li>
                {/each}
              </ul>
            </Expandable>
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
                    <Filelink href="{stats.themeFolder}/templates/{template}">
                      {template}
                    </Filelink>
                    {#if stats.templates[template].hasIncludes}
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
        <!-- <Expandable open={true}>
          <h3 slot="opener" >Generate Critical CSS</h3>
          <ul>
            {#each Object.keys(stats.templates) as template}
              <li> <input id="crit-#{template}" type="checkbox"  /> <label for="crit-#{template}"> { template } </label> </li>
            {/each}
          </ul>
        </Expandable> -->
        <!-- not loading -->
      {/if}
    </span>
    <span slot="tab2">
      {#if $hasSchema}
        <h3>Schema found</h3>
        <Filelink href={currentFile}>
          <h3>{((currentFile || "").match(/[^\/]+$/) || ["no file"])[0]}</h3>
        </Filelink>
        <Schema />
      {:else if schema_error}
        <h3>Schema with JSON error found</h3>
        <Filelink href={currentFile}>
          <h3>{((currentFile || "").match(/[^\/]+$/) || ["no file"])[0]}</h3>
        </Filelink>
        <div box>
          {schema_error.message}
          <code>
            {#each schema_error.content.split(/\n/) as line}
              <span class="nowrap"
                >{@html escapeHtml(line).replace(/\s/g, "&nbsp;")}
              </span><br />
            {/each}
          </code>
        </div>
      {:else}
        <h3>No Schema found</h3>
        <Filelink href={currentFile}>
          <h3>{((currentFile || "").match(/[^\/]+$/) || ["no file"])[0]}</h3>
        </Filelink>
      {/if}
      <!-- <div style="--json-tree-label-color: var(--vscode-debugTokenExpression-name); --json-tree-string-color: var(--vscode-debugTokenExpression-string); --json-tree-number-color: var(--vscode-debugTokenExpression-number);">
          <JSONTree value={$schema} />
        </div> -->
    </span>
    <span slot="tab3">
      <Expandable open={true}>
        <h3 slot="opener" class="relative">Errors</h3>
        <div
          style="--json-tree-label-color: var(--vscode-debugTokenExpression-name); --json-tree-string-color: var(--vscode-debugTokenExpression-string); --json-tree-number-color: var(--vscode-debugTokenExpression-number);"
        >
          {#each Object.keys(build_errors_by_file) as file}
            <Expandable open={true}>
              <h4 slot="opener" class="warning-label">{(file.match(/\/[^\/]+$/) || ['unknown'])[0]}</h4>
              <div>
                {#each Object.keys(build_errors_by_file[file]) as pos}
                  <Expandable open={true}>
                    <h4 slot="opener" class="warning-label">{build_errors_by_file[file][pos].message || build_errors_by_file[file][pos].code}</h4>
                    <code class="warning-text warning-frame">
                      {build_errors_by_file[file][pos].message}
                      {#each (build_errors_by_file[file][pos].frame || "").split("\n") as line}
                        <span class="nowrap">
                          {@html escapeHtml(line.replace("^", "👆")).replace(
                            /\s/g,
                            "&nbsp;"
                          )}
                        </span> <br />
                      {/each}
                    </code>
                    <JSONTree value={build_errors_by_file[file][pos]} />
                  </Expandable>
                {/each}
              </div>
            </Expandable>
          {/each}
        </div>
      </Expandable>
      <Expandable open={true}>
        <h3 slot="opener" class="relative">Warnings</h3>
        <div
          style="--json-tree-label-color: var(--vscode-debugTokenExpression-name); --json-tree-string-color: var(--vscode-debugTokenExpression-string); --json-tree-number-color: var(--vscode-debugTokenExpression-number);"
        >
          {#each Object.keys(build_warnings_by_file) || [] as file}
            <Expandable>
              <h4 slot="opener" class="warning-label">{(file.match(/\/[^\/]+$/) || ['unknown'])[0]}</h4>
              <div>
                {#each Object.keys(build_warnings_by_file[file]) as pos}
                  <Expandable>
                    <h4 slot="opener" class="warning-label">{build_warnings_by_file[file][pos].message || build_warnings_by_file[file][pos].code}</h4>
                    <code class="warning-text warning-frame">
                      {build_warnings_by_file[file][pos].message}
                      {#each (build_warnings_by_file[file][pos].frame || "").split("\n") as line}
                        <span class="nowrap">
                          {@html escapeHtml(line.replace("^", "👆")).replace(
                            /\s/g,
                            "&nbsp;"
                          )}
                        </span> <br />
                      {/each}
                    </code>
                    <JSONTree value={build_warnings_by_file[file][pos]} />
                  </Expandable>
                {/each}
              </div>
            </Expandable>
          {/each}
        </div>
      </Expandable>
    </span>
  </Tabs>
</div>

<style>
  div[box] {
    margin: 0.3em 0.1em;
    padding: 0.2em 0.1em 0.2em 0.3em;
    border: 1px solid rgba(204, 204, 204, 0.342);
    background-color:rgba(142, 142, 142, 0.1)
  }
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
    padding: 0.4em 0.2em;
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
  h1 {
    font-size: 1.5em;
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

  .warning-label {
    color: var(--vscode-debugTokenExpression-name);
  }

  .warning-text {
    color: var(--vscode-debugTokenExpression-string);
  }

  .warning-number {
    color: var(--vscode-debugTokenExpression-number);
  }

  .warning-frame {
    padding: 0.5em 0.3em 0.5em 1em;
  }

  .badge {
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    position: absolute;
    left: 100%;
    bottom: 100%;
    border-radius: 55%;
    padding: 0.5em;
    font-size: 8px;
    min-width: 2.2em;
    text-align: center;
  }

  .badge[color=yellow] {
    background-color: var(--vscode-editorMarkerNavigationWarning-background);
    color: var(--vscode-activityBarBadge-foreground);
  }
  .badge[color=red] {
    background-color: var(--vscode-editorMarkerNavigationError-background);
    color: var(--vscode-activityBarBadge-foreground);
  }
  .badge~.badge {
    left: calc(80% - 1.2em);
  }

  .schema-changes {
    padding: 0.5em 0.2em;
    background-color: var(--vscode-panel-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-foreground);
    margin: 1em 0;
  }
  .schema-changes-actions {
    display: flex;
    margin-top: 0.5em;
  }
  .schema-changes-actions button {
    margin: 0.2em;
  }
  button[secondary] {
    background-color: var(--vscode-button-secondaryBackground);
  }

  .nowrap {
    white-space: nowrap;
  }

  .btn-watching {
    background-color: var(--vscode-debugConsole-warningForeground);
  }

  button {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }


</style>
