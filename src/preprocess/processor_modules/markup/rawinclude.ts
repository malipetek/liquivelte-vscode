import type MagicString from 'magic-string';

export default function rawIncludeProcessor (markup: string, ms: MagicString): MagicString {
  markup.replace(/\{%-*\s*(rawinclude)\s*['"](.*?)['"]\s*(.*?)\s*-*%\}/gim, (a, keyword, include, rest) =>
  {
    a;
    keyword;
    include;
    rest;
    return '';
  });

  return ms;
}