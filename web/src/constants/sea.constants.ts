import type { StepKind, Zone } from "#/types/sea.types";

// Real ocean zones in meters; the last one is the deepest trench.
export const ZONES: Zone[] = [
  { id: "sunlight", from: 0, to: 200 },
  { id: "twilight", from: 200, to: 1000 },
  { id: "midnight", from: 1000, to: 4000 },
  { id: "abyss", from: 4000, to: 6000 },
  { id: "trench", from: 6000, to: 11000 },
];

// Every zone gets the same scroll height, so meters are non-linear in pixels.
export const ZONE_PX = 900;
// Room for the zone label when a step sits right at the top of its zone.
export const ZONE_HEAD = 64;
export const STEP_GAP = 120;

// Stage = zone: each step starts no higher than its stage's zone.
export const FLOOR_M: Record<StepKind, number> = {
  start: 0,
  guard: 0,
  llm: 200,
  tool: 1000,
  gen: 4000,
  decision: 4000,
  cite: 4000,
  seabed: 5500,
  abort: 0,
};

// The diver rides at 30% of the viewport height; the latest step is followed to this line.
export const DIVER_LINE = 0.3;
// three.js units of camera travel per zone.
export const WORLD_PER_ZONE = 60;
export const SEA_MAX_PIXEL_RATIO = 1.75;

// Keyframes over zone position (0 = the waterline, 1 = one zone down).
export const WATER_KEYS: [number, string][] = [
  [0, "--color-water-0"],
  [0.6, "--color-water-1"],
  [1.4, "--color-water-2"],
  [2.4, "--color-water-3"],
  [3.5, "--color-water-4"],
  [5, "--color-water-5"],
];
export const FOG_KEYS: [number, number][] = [
  [0, 0.02],
  [1, 0.032],
  [2.5, 0.05],
  [5, 0.06],
];
export const AMBIENT_KEYS: [number, number][] = [
  [0, 0.95],
  [0.8, 0.45],
  [1.6, 0.14],
  [3, 0.05],
  [5, 0.03],
];
export const SUNLIGHT_KEYS: [number, number][] = [
  [0, 0.7],
  [1, 0.1],
  [2, 0],
];
export const SHAFT_KEYS: [number, number][] = [
  [0, 0.13],
  [0.7, 0.05],
  [1, 0],
];
