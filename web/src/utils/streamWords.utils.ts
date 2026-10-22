import type { StreamToken } from "#/types/streamWords.types";

/** Splits text into words and the spaces between them; words are numbered from `start` so a second line keeps streaming after the first. */
export function streamTokens(text: string, start = 0): StreamToken[] {
  let index = start;
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part) =>
      part.trim()
        ? { text: part, index: index++ }
        : { text: part, index: null },
    );
}
