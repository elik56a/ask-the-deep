import {
  ASCEND_SPEED,
  ASCENT_MIN_SPEED,
  ASCENT_SLOW_GAIN,
  ASCENT_SLOW_PX,
  DIVER_LINE,
  FOLLOW_GAIN,
  FOLLOW_SPEED,
  GLIDE_DONE_PX,
  RESYNC_PX,
  RUSH_GAIN,
  RUSH_SPEED,
  SCROLL_DOWN_KEYS,
  SCROLL_UP_KEYS,
} from "#/constants/sea.constants";
import type {
  Glide,
  ScrollDirection,
  ScrollIntent,
} from "#/types/scroll.types";
import type { DiveMode } from "#/types/sea.types";

/** The next scroll position from `y`: eased in proportion to the gap, never overshooting `to`. */
export function glideStep(
  y: number,
  glide: Glide,
  dt: number,
  snap: boolean,
): number {
  const gap = glide.to - y;
  const distance = Math.abs(gap);
  if (distance < GLIDE_DONE_PX) return y;
  if (snap) return glide.to;
  const eased = Math.min(
    distance * Math.min(1, dt * glide.gain),
    glide.speed * dt,
  );
  const move = Math.min(Math.max(eased, glide.minSpeed * dt), distance);
  return y + Math.sign(gap) * move;
}

/** The scroll position that puts a step `stepTop` px down the water at the diver line. */
export function diverLineY(
  waterTop: number,
  stepTop: number,
  viewport: number,
): number {
  return waterTop + stepTop - viewport * DIVER_LINE;
}

/** Following the dive: the calm descent, or the rush back down to the sand. */
export function followGlide(to: number, rushing: boolean): Glide {
  return rushing
    ? { to, speed: RUSH_SPEED, gain: RUSH_GAIN, minSpeed: 0 }
    : { to, speed: FOLLOW_SPEED, gain: FOLLOW_GAIN, minSpeed: 0 };
}

/** The ascent to the top: gentler over the last stretch, but never crawling. */
export function ascentGlide(y: number): Glide {
  return {
    to: 0,
    speed: ASCEND_SPEED,
    gain: y < ASCENT_SLOW_PX ? ASCENT_SLOW_GAIN : FOLLOW_GAIN,
    minSpeed: ASCENT_MIN_SPEED,
  };
}

/**
 * At the seabed any scroll pauses the follow; during the dive only scrolling up does, and
 * scrolling down holds at the latest step (`limit`) once it gets there.
 */
export function scrollIntent(
  mode: DiveMode,
  direction: ScrollDirection,
  y: number,
  limit: number | null,
): ScrollIntent {
  if (mode === "reveal" || direction === "up") return "pause";
  return limit !== null && y >= limit - RESYNC_PX ? "hold" : "pass";
}

/** The way a key scrolls the page, if it does. */
export function keyDirection(
  key: string,
  shift: boolean,
): ScrollDirection | null {
  if (key === " ") return shift ? "up" : "down";
  if (SCROLL_DOWN_KEYS.includes(key)) return shift ? null : "down";
  return SCROLL_UP_KEYS.includes(key) ? "up" : null;
}

/** Scrolling inside the chat (`[data-console]`) is the chat's own, not the dive's. */
export function inConsole(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-console]") !== null;
}
