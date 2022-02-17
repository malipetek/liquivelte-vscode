export default function createTagRegex(tagName, flags) {
  return new RegExp(`/<!--[^]*?-->|<${tagName}(\\s[^]*?)?(?:>([^]*?)<\\/${tagName}>|\\/>)`, flags);
}