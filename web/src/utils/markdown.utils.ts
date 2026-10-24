import { BARE_URL } from "#/constants/markdown.constants";

// CommonMark links only `[text](url)` and `<url>`; models often write the URL bare.
export function linkBareUrls(text: string): string {
  return text.replace(BARE_URL, (url) => `<${url}>`);
}
