export interface parsedToken
{
  tagName: string;
  includeName: string;
  props: { [key: string]: string };
  isFolder?: boolean;
}