import createTagRegex from "./create-tag-regex";
export default function (markup: string, tagsToStrip? : string[]) : string
{
  tagsToStrip = tagsToStrip || ['style', 'script'];
  return tagsToStrip.map(tag =>
    createTagRegex(tag, 'gim'))
    .reduce((col, reg) => col.replace(reg, ''), markup);
}