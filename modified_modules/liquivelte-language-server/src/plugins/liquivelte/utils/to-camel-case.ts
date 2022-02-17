export default function (str: string)
{
  return str.replace(/(^(.))|\-(.)/gi, (c, l) => c.toUpperCase()).replace(/-/g, '');
}