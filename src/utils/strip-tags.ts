import createTagRegex from "./create-tag-regex";
export default function (markup: string, tagsToStrip? : string[]) : string
{
  tagsToStrip = tagsToStrip || ['style', 'script'];
  return tagsToStrip.map(tag =>
    createTagRegex(tag, 'gim'))
    .reduce((col, reg) =>
    {
      return col.replace(reg, (a, props) =>
      {
        if (/liquivelte-keep/.test(props)) {
          return a;
        }
        return '';
      });
    }, markup);
}