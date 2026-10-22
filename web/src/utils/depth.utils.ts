import {
  AIR_C,
  AIR_LAPSE_C_PER_M,
  AIR_SCALE_HEIGHT_M,
  DIVER_LINE,
  FLOOR_M,
  STEP_GAP,
  SURFACE_Y,
  WATER_TEMP_KEYS,
  WATERLINE_Y,
  ZONE_HEAD,
  ZONE_PX,
  ZONES,
} from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { DiveStep, StepKind, Zone, ZoneId } from "#/types/sea.types";
import { formatInt } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";

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

// A card that would cover a zone's label starts just below it.
function clearOfLabels(top: number, height: number): number {
  const label = ZONES.map((zone) => metersToPx(zone.from)).find(
    (line) => top < line + ZONE_HEAD && top + height > line,
  );
  return label === undefined ? top : label + ZONE_HEAD;
}

/** Top of each step in px: at its floor, or one gap below the step before, whichever is deeper. */
export function placeSteps(
  steps: { kind: StepKind; height: number }[],
): number[] {
  let bottom = -STEP_GAP;
  return steps.map(({ kind, height }) => {
    const top = clearOfLabels(
      Math.max(bottom + STEP_GAP, floorPx(kind)),
      height,
    );
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

/** The eye's height while the camera sinks from the boat to the waterline (`px` still negative). */
export function surfaceEye(scrollY: number, px: number): number {
  return (
    SURFACE_Y + (WATERLINE_Y - SURFACE_Y) * smoothstep(scrollY / (scrollY - px))
  );
}

/**
 * What the depth tag reads: under water the depth, its temperature and the pressure (1 atm of air
 * plus one per 10 m); above it the eye's height, the air's temperature and pressure.
 */
export function depthReadout(meters: number, eye: number, airTemp: string) {
  if (eye > 0) {
    return {
      depth: `+${eye.toFixed(1)}`,
      temp: fill(airTemp, { t: (AIR_C - eye * AIR_LAPSE_C_PER_M).toFixed(0) }),
      pressure: `${Math.exp(-eye / AIR_SCALE_HEIGHT_M).toFixed(2)} atm`,
    };
  }
  const atm = 1 + meters / 10;
  const temp = keyframe(meters, WATER_TEMP_KEYS);
  return {
    depth: formatInt(meters),
    temp: `${temp.toFixed(meters < 1000 ? 0 : 1)} °C`,
    pressure: `${meters < 100 ? atm.toFixed(1) : formatInt(atm)} atm`,
  };
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

function opens(step: DiveStep, result: StreamEvent["event"]): boolean {
  const open = step.event.event;
  if (result.type === "llm.completed") {
    return open.type === "llm.started" && open.call === result.call;
  }
  if (result.type === "tool.completed") {
    return open.type === "tool.called" && open.tool === result.tool;
  }
  return false;
}

/** The dive log: one step per stage, with a model or tool call closed by its result. */
export function diveSteps(events: StreamEvent[]): DiveStep[] {
  const steps: DiveStep[] = [];
  for (const item of events) {
    const opener = [...steps].reverse().find((step) => opens(step, item.event));
    if (opener) {
      opener.result = item;
      continue;
    }
    const kind = stepKindOf(item.event);
    if (kind) steps.push({ kind, event: item, result: null });
  }
  return steps;
}
