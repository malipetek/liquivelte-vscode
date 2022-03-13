# Liquivelte

> Create your Shopify theme with Svelte like components!

Liquivelte is a preprocessor and some utilities to generate compiled code and liquid content to enable SSR for data that is available in the Liquid context.

This plugin carries out a rollup build process in the background and generates necessary JS, CSS and Liquid content. Please be aware of file changes to your existing theme.

## Why
Because we love SvelteJS ♥️

## How
For every template/layout, we check for liquivelte includes and generate **JS** and **CSS** per file. This means on any page on store front we can have 2 entry points. For example you included 4 snippets with liquivelte format on the product template and you have 1 on the layout containing it. Then still 2 bundles will be included but one of them will initialize 4 modules and other will init 1.

We convert import statements from theme to prop imports for main components. We use same data for generating liquid content that will hopefully generate html to be hydrated by **SvelteJS**.

# Examples
```
<script>
  import product from 'theme';
  import product.title from 'theme';
  import ProductTitle from './folder/product-title.liquivelte';
  import Badge from './badge.liquivelte';

</script>

<ProductTitle bind:title="{title}">
    {% if product.available %}
      <Bagde> Available </Bagde>
    {% endif %}
</ProductTitle>

{% for image in product.images %}
  <div class="icon"> 
    {% include 'icon-pin' %}
  </div> 
{% endfor %}

<form class="form" prop="product" type="product" product >
  <div class="icon">
    {% include 'icon-close' %}
  </div>
  <input bind:value="{title}" type="text" />
  <input type="button" value="Add to cart" on:click="{ () => window.alert('hydrated') }" />
  <button type="button" on:click="{alertValue}"> Click Meh </button>
</form>

<style lang="scss">
  .icon { 
      width: 20px; 
    }
  input[text] {
    border: 1px solid olivedrab;  
  }
  form {
    border: 1px solid red;
  }
</style>
```
## How to include
- We can include a snippet with this syntax `{% include 'liquivelte', module: '[module_name]' %}`
- We can include sections as usual, we will check if it is in `src/sections` folder.
## Can do's
- ✅ We can import json serializable liquid objects with `import [__] from 'theme';` syntax
- We can import liquid object props with `import [__].[__] from 'theme;` syntax

- ✅ We can use liquid expression with dashes `{{- [__] -}}`
This is because we can not determine if it is a **SvelteJS** expression with an object declaration or a liquid output.

- ✅ We can include a form with type and prop, prop is for example product in the form type 'product'.

- ✅ We can include other snippets with `{% include '[__]' %}` syntax as usual.

- ✅ We can use control flow tags `{% if %}`, `{% else %}`, `{% elsif %}`, `{% endif %}`, `{% for %}`, `{% endfor %}``

## What we can not do
- ❌ We can not use `{{ [__] }}` syntax.

- ❌ We can not use `{% render %}`
- ❌ We can not have folders in sections folder.
- ❌ We can not use `with` when including liquivelte snippet : `{% include 'liquivelte' with module: '[module_name]' %}`
