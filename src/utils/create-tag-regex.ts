export default function createTagRegex(tagName, flags) {
  return new RegExp(`/<!--[^]*?-->|<${tagName}(\\s[^]*?)?(?:>([^]*?)<\\/${tagName}>|\\/>)`, flags);
}

export function createSimplerTagRegex (tagName, flags)
{
  return new RegExp(`/<${tagName}(\\s[^>]+)>/`, flags);
}