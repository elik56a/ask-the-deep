import type { Spread } from "#/types/seaScene.types";

/** The value of `spread` for group member `index`, given a random draw in [0, 1). */
export function spreadAt(
  spread: Spread,
  index: number,
  random: number,
): number {
  if (typeof spread === "number") return spread;
  const { base = 0, step = 0, jitter = 0 } = spread;
  return base + index * step + random * jitter;
}
