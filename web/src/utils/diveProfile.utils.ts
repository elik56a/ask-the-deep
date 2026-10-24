import { PROFILE_CHART, ZONE_PX } from "#/constants/sea.constants";
import type { DiveStep, ProfilePoint } from "#/types/sea.types";

/**
 * The dive drawn the way divers read it: depth against time, from the
 * surface to the last step. Each leg belongs to the step it reaches, so a
 * stage's colour runs from where it started to how deep it took us.
 */
export function diveProfile(
  steps: DiveStep[],
  tops: number[],
  totalMs: number,
): ProfilePoint[] {
  const last = steps.length - 1;
  return [
    { t: 0, zone: 0, kind: "start" },
    ...steps.map((step, i) => ({
      t: i === last ? totalMs : step.event.t_ms,
      zone: (tops[i] ?? 0) / ZONE_PX,
      kind: step.kind,
    })),
  ];
}

/** Where the profile lands in `PROFILE_CHART`: time along x, zones down y. */
export function profileScale(points: ProfilePoint[], totalMs: number) {
  const { width, height, pad, headroom } = PROFILE_CHART;
  const maxZone =
    Math.max(...points.map((point) => point.zone)) * headroom || 1;
  return {
    maxZone,
    x: (t: number) =>
      pad.start + (t / (totalMs || 1)) * (width - pad.start - pad.end),
    y: (zone: number) =>
      pad.top + (zone / maxZone) * (height - pad.top - pad.bottom),
  };
}
