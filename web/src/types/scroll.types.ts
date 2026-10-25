export type ScrollDirection = "up" | "down";

/** What a visitor's scroll does to the follow: pause it, hold the page at the step, or nothing. */
export type ScrollIntent = "pause" | "hold" | "pass";

/** One glide towards `to`: capped at `speed` px/s, pulled by `gain` per second, at least `minSpeed`. */
export interface Glide {
  to: number;
  speed: number;
  gain: number;
  minSpeed: number;
}
