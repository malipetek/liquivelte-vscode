const num = (n) => {
  if (n.aspect_ratio) {
      n = n.aspect_ratio;
  }
  return n;
}

function isValidHttpUrl(string) {
  let url;
  string = string.replace(/^\/\//, 'https://');
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}
function handleize(str) {
  str = str.toLowerCase();

  var toReplace = ['"', "'", "\\", "(", ")", "[", "]"];

  // For the old browsers
  for (var i = 0; i < toReplace.length; ++i) {
    str = str.replace(toReplace[i], "");
  }

  str = str.replace(/\W+/g, "-");

  if (str.charAt(str.length - 1) == "-") {
    str = str.replace(/-+\z/, "");
  }

  if (str.charAt(0) == "-") {
    str = str.replace(/\A-+/, "");
  }

  return str;
};

export default (liquid_expression_cache) => ({
  default: (input, fallback) => {
      let isObject = false;
      try { isObject = input.constructor === {}.constructor; } catch (err) { }
      if (input == 'undefined' || input == 'null' || input == '[]' || input == '[Object]') {
          return fallback || '';
      } else if (input && (input.length || isObject)) {
          return input;
      } else {
          return fallback || '';
      }
  },
  append: (input, str) => input + str + "",
  prepend: (input, str) => str + input + "",
  img_url: (input, size) => {
      if (liquid_expression_cache['img_url'] && liquid_expression_cache['img_url'].has(`${input}${size}`)) {
          return liquid_expression_cache['img_url'].get(`${input}${size}`);
      }
      // console.log('img url');
      if (!input) {
          return input = `//cdn.shopify.com/shopifycloud/shopify/assets/no-image-2048-5e88c1b20e087fb7bbe9a3771824e743c244f437e4f8ba93bbf7b11b53f7824c.gif`;
      }
      while (input.src) {
          input = input.src;
      }
      if (input.image) {
          input = input.image;
      }
      if (input.constructor !== String) {
          return input = `//cdn.shopify.com/shopifycloud/shopify/assets/no-image-2048-5e88c1b20e087fb7bbe9a3771824e743c244f437e4f8ba93bbf7b11b53f7824c.gif`;
      }
      /* if (/_(lg|md|sm)_/.test(input)) {
          return input.replace(/_(lg|mg|sm)_/, `_$1_${size}_`);
      } else if (/_(lg|md|sm)/.test(input)) {
          return input.replace(/_(lg|mg|sm)/, `_$1_${size}`);
      } else {
      } */
      if (!isValidHttpUrl(input)) {
          input = `https://cdn.shopify.com/s/files/1/0621/4444/6683/${input}`;
      }
      return input.replace(/\.([^\.]+)($|\?)/, `_${size}.$1?`);
  },
  file_url: (input) => {
      if (liquid_expression_cache['file_url'] && liquid_expression_cache['file_url'].has(`${input}`)) {
          return liquid_expression_cache['file_url'].get(`${input}`);
      }
      return `//cdn.shopify.com/s/files/1/0621/4444/6683/files/${input}?v=${(Math.random() * 9e15).toString(36)}`;
  },
  money: (input) => {
      input = String(input);
      if (isNaN(parseInt(input))) {
          return `$0.00`;
      }
      if (input.length > 2) {
          return `$${((+input.slice(0, -2)).toLocaleString())}.${input.slice(-2)}`;
      } else {
          return `$${input}`;
      }
  },
  capitalize: (input) => (input[0].toUpperCase() + input.slice(1)),
  divided_by: (input, n) => (num(input) / num(n)),
  times: (input, n) => (num(input) * num(n)),
  escape: (input) => escape(input),
  replace: (input, rep, tar) => {
      return input.replace(new RegExp(rep), tar);
  },
  within: (url, collection) => {
      return `/collections/${collection.handle}/${url}`;
  },
  split: (input, splitter) => input.split(splitter),
  first: (input) => input[0],
  last: (input) => input[input.length - 1],
  link_to_tag: (tag) => {
      const u = new URL(window.location.href);
      return `<a href="${u.protocol}//${u.host}${u.pathname}/${tag}"> ${tag} </a>`;
  },
  crop: (input, cropType) => {
      return input.replace(/\.([^\.]+)[$\?]/, `_crop_${cropType}.$1?`);
  },
  plus: (input) => +input + 1,
  minus: (input) => +input - 1,
  scale: (input, scale) => {
      return input.replace(/\.([^\.]+)[$\?]/, `@${scale}x.$1?`);
  },
  handleize,
  json: (input) => JSON.stringify(input),
  date: x => x,
  t: (input) => {
      if (liquid_expression_cache['t'] && liquid_expression_cache['t'].has(`${input}`)) {
          return liquid_expression_cache['t'].get(`${input}`);
      }
      return `Could not get translation`;
  }
});