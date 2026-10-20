import {
  DIVER_LINE,
  FLOOR_M,
  STEP_GAP,
  ZONE_HEAD,
  ZONE_PX,
  ZONES,
} from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { StepKind, Zone, ZoneId } from "#/types/sea.types";

const last = ZONES.length - 1;

export function zoneAt(meters: number): Zone {
  return ZONES.find((zone) => meters < zone.to) ?? ZONES[last];
}

export function metersToPx(meters: number): number {
  const index = Math.max(ZONES.indexOf(zoneAt(meters)), 0);
  const zone = ZONES[index];
  const into = Math.min((meters - zone.from) / (zone.to - zone.from), 1);
  return (index + Math.max(into, 0)) * ZONE_PX;
}

export function pxToMeters(px: number): number {
  const position = Math.max(px, 0) / ZONE_PX;
  const index = Math.min(Math.floor(position), last);
  const zone = ZONES[index];
  return zone.from + Math.min(position - index, 1) * (zone.to - zone.from);
}

export function floorPx(kind: StepKind): number {
  const meters = FLOOR_M[kind];
  const atZoneTop = ZONES.some((zone) => zone.from === meters);
  return metersToPx(meters) + (atZoneTop ? ZONE_HEAD : 0);
}

/** Top of each step in px: at its floor, or one gap below the step before, whichever is deeper. */
export function placeSteps(
  steps: { kind: StepKind; height: number }[],
): number[] {
  let bottom = -STEP_GAP;
  return steps.map(({ kind, height }) => {
    const top = Math.max(bottom + STEP_GAP, floorPx(kind));
    bottom = top + height;
    return top;
  });
}

/** Px of the water column at the diver line; negative while above the water. */
export function diveOffset(
  scrollY: number,
  waterTop: number,
  viewport: number,
): number {
  return scrollY - Math.max(waterTop - viewport * DIVER_LINE, 1);
}

export function zoneLabel(px: number): ZoneId | "surface" {
  return px <= 0 ? "surface" : zoneAt(pxToMeters(px)).id;
}

/** Linear value between sorted `[at, value]` keys, held flat outside them. */
export function keyframe(at: number, keys: [number, number][]): number {
  const next = keys.findIndex(([key]) => at <= key);
  if (next === 0) return keys[0][1];
  if (next === -1) return keys[keys.length - 1][1];
  const [from, a] = keys[next - 1];
  const [to, b] = keys[next];
  return a + (b - a) * ((at - from) / (to - from));
}

export function smoothstep(k: number): number {
  const x = Math.min(Math.max(k, 0), 1);
  return x * x * (3 - 2 * x);
}

/** The step a server event adds to the dive, or null when it only updates one. */
export function stepKindOf(event: StreamEvent["event"]): StepKind | null {
  switch (event.type) {
    case "request.started":
      return "start";
    case "guardrails.checked":
      return event.checks.every((check) => check.passed) ? "guard" : "abort";
    case "cache.checked":
      return "guard";
    case "llm.started":
      return "llm";
    case "tool.called":
    case "retrieval.completed":
      return "tool";
    case "generation.started":
      return "gen";
    case "decision.made":
      return "decision";
    case "citations.attached":
      return "cite";
    case "error":
      return "abort";
    case "request.finished":
      return event.outcome === "answered" || event.outcome === "no_information"
        ? "seabed"
        : "abort";
    case "llm.completed":
    case "tool.completed":
    case "retrieval.started":
    case "text.delta":
    case "usage.reported":
      return null;
  }
}
