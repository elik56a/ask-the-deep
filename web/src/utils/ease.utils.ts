/** Moves `from` towards `to` at `rate` per second, frame-rate independent enough for UI motion. */
export function approach(
  from: number,
  to: number,
  rate: number,
  dt: number,
): number {
  return from + (to - from) * Math.min(dt * rate, 1);
}

/** base + amp × sin(t × rate + phase). */
export function oscillate(
  base: number,
  amp: number,
  rate: number,
  t: number,
  phase = 0,
): number {
  return base + amp * Math.sin(t * rate + phase);
}

export function easeOutCubic(k: number): number {
  return 1 - (1 - Math.min(Math.max(k, 0), 1)) ** 3;
}

/** `x` held to [0, 1]. */
export function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}
