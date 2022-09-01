# Change Log

## 0.0.11

- Last individual builds version. We are running rollup build process for each template and layout.

## 1.0.0

- Switched to modulejs build and all builds are done with one rollup build with multiple entry points.

## 1.0.1

- Fixed liquid expression default. For example if you put a liquid expression `{{- variable -}}` it used to be converted to this svelte expression `{ variable || '' }` in order to prevent any `undefined` on the page. However when we are using this with some `bind:group` props, this kind of expression throws an error. If you still want to make sure there any `undefined` on the page you can use `default` filter like so: `{{- variable | default: '' -}}`.

## 1.0.2
- Fixed fallback loader for loading sections as separate modules is kicking in before regular initialization.

## 1.0.3
- Fixed build errors not coming through. When theres a build error whole build fails, keep an eye on issues tab.

## 1.0.4
- Fixed css plugin for included modules. Fixed regexp gets exported variables for that without a default value.