export default function getLineFromOffset (str: string, offset: number): number | undefined
{
  let line = 0;
  let pos = 0;
  while (pos < offset) {
    if (str[pos] === '\n') {
      line++;
    }
    pos++;
  }
  return line + 1;
}