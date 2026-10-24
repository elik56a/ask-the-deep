import type { ScoredPassage } from "#/generated/events.gen";
import { clamp01 } from "#/utils/ease.utils";

/** The copy on either side of `token`, so a node can go in its place. */
export function splitAround(template: string, token: string): [string, string] {
  const [before, after = ""] = template.split(token);
  return [before, after];
}

/** How full each writing bar is: they fill one after another as the words stream, each up to its `lengths` share. */
export function writtenBars(
  words: number,
  total: number,
  lengths: readonly number[],
): number[] {
  const filled = (words / Math.max(total, 1)) * lengths.length;
  return lengths.map((length, line) => clamp01(filled - line) * length);
}

/** Passages that cleared the gate. */
export function passedCount(passages: ScoredPassage[]): number {
  return passages.filter((p) => p.above_threshold).length;
}
