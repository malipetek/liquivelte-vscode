
  export const setting_types = [
    "header",
    "paragraph",

    "checkbox",
    "number",
    "radio",
    "range",
    "select",
    "text",
    "textarea",

    "article",
    "blog",
    "collection",
    "collection_list",
    "color",
    "color_background",
    "font_picker",
    "html",
    "image_picker",
    "link_list",
    "liquid",
    "page",
    "product",
    "product_list",
    "richtext",
    "url",
    "video_url",
  ];


  const default_attrs = ["id", "label", "default", "info"];

  const setting_keys = {
    header: ["content"],
    paragraph: ["content"],
    checkbox: [...default_attrs],
    number: [...default_attrs, "placeholder"],
    radio: [...default_attrs, "options"],
    range: [...default_attrs, "min", "max", "step", "unit"],
    select: [...default_attrs, "options"],
    text: [...default_attrs, "placeholder"],
    textarea: [...default_attrs, "placeholder"],

    article: [...default_attrs],
    blog: [...default_attrs],
    collection: [...default_attrs],
    collection_list: [...default_attrs],
    color: [...default_attrs],
    color_background: [...default_attrs],
    font_picker: [...default_attrs],
    html: [...default_attrs, "placeholder"],
    image_picker: [...default_attrs],
    link_list: [...default_attrs],
    liquid: [...default_attrs],
    page: [...default_attrs],
    product: [...default_attrs],
    product_list: [...default_attrs],
    richtext: [...default_attrs],
    url: [...default_attrs],
    video_url: [...default_attrs],
  };


  export const newSetting = () => {
    const s = {};
    default_attrs.forEach((k) => (s[k] = ""));
    return s;
  };

  export const convertSetting = (initialSetting, setting) => {
    const type = setting.type;
    const _setting = { ...setting };
    for(let key in _setting) {
      if(key !== 'type' && setting_keys[type].indexOf(key) === -1) {
        delete _setting[key];
      }
    }
    for (let key in setting_keys[type]) {
      _setting[setting_keys[type][key]] = _setting[setting_keys[type][key]] || initialSetting[setting_keys[type][key]] || (setting_keys[type][key] === 'options' ? [] : "");
    }
    if (type === 'select' || type === 'radio') {
      _setting.options = _setting.options.map((o) => ({ label: "", value: "", group: "", ...o }));
    }
    if (type === 'number') {
      _setting.max = +_setting.max || null;
      _setting.default = +_setting.default || 0;

    }
    console.log('transforming setting', _setting);
    if (type === 'range') {
      console.log('transforming range', _setting);
      _setting.min = +_setting.min || 0;
      _setting.max = +_setting.max || 100;
      _setting.step = +_setting.step || 1;
      _setting.default = +_setting.default || 1;
      console.log('transforming range', _setting);
    }
    return {..._setting, type};
  };

export const addDefaultEmptySettingsFields = (schema) => {
  Object.keys(schema).forEach(function (key) {
    if (key === 'settings') {
      schema[key] = schema[key].map(setting => convertSetting(setting, setting));
    }
    if (key === 'blocks') {
      schema[key] = schema[key].map(block => {
        if (block.settings) {
          block.settings = block.settings.map(setting => convertSetting(setting, setting));
        }
        return block;
      });
    }
  });
  return schema;
};
