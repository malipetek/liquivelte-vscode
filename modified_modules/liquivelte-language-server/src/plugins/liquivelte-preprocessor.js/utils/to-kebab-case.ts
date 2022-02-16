export default function (str: string)
{
  return str.replace(/(^\w)/, w => w.toLowerCase()).replace(/[A-Z]/g, w => '-' + w.toLowerCase());
}
