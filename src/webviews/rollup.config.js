const svelte = require("rollup-plugin-svelte");
const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");
const sveltePreprocess = require("svelte-preprocess");
const css = require('rollup-plugin-css-only');
const path = require("path");
const fs = require("fs");
const { terser } = require("rollup-plugin-terser");

const production = !process.env.ROLLUP_WATCH;

module.exports = fs
  .readdirSync(path.join(__dirname, "pages"))
  .map((input) => {
    const name = input.split(".")[0];
    return {
      input: path.join(__dirname, "pages", input),
      output: {
        external: ['vscode'],
        globals: {
          "window.vscode": "vscode",
        },
        sourcemap: true,
        format: "iife",
        name: "app",
        file: path.join(__dirname, '..', '..', 'dist', 'src', 'webviews', name + '.js'),
      },
      plugins: [
        svelte({
          // enable run-time checks when not in production
          dev: !production,
          // we'll extract any component CSS out into
          // a separate file - better for performance
        }),
        css({ output: `${name}.css`}),

        // If you have external dependencies installed from
        // npm, you'll most likely need these plugins. In
        // some cases you'll need additional configuration -
        // consult the documentation for details:
        // https://github.com/rollup/plugins/tree/master/packages/commonjs
        resolve({
          browser: true,
          dedupe: ["svelte"],
        }),
        commonjs(),

        // In dev mode, call `npm run start` once
        // the bundle has been generated
        // !production && serve(),

        // Watch the `public` directory and refresh the
        // browser on changes when not in production
        // !production && livereload("public"),

        // If we're building for production (npm run build
        // instead of npm run dev), minify
        production && terser(),
      ],
      watch: {
        clearScreen: false,
      },
    };
  });
