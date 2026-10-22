import {
  ALIEN_GLOW,
  DARK_FISH_GLOW,
  JELLY_GLOW,
  OCTOPUS_GLOW,
  WRECK_GLOW,
} from "#/constants/seaScene.constants";
import type { BedProp, LifeGroup } from "#/types/seaScene.types";

// Each download has its own axes; these turn the ones that need it to face +z.
const FACE_SIDEWAYS = [0, -Math.PI / 2, 0] as const;
const LIE_FLAT = [0, 0, Math.PI / 2] as const;
// Seabed props turn to a random heading.
const ANY_HEADING = { jitter: 6 };

/** Everything that swims or drifts in the water column, by depth (v3 prototype). */
export const SEA_LIFE: LifeGroup[] = [
  {
    model: "sardines",
    count: 4,
    length: { base: 7, step: 1.5 },
    speed: 0.9,
    path: {
      y: { base: -10, step: -13 },
      r: { base: 13, step: 3 },
      speed: { base: 0.09, step: 0.03 },
      phase: { step: 2.1 },
      z: -20,
    },
  },
  {
    model: "fish",
    count: 12,
    length: { base: 1.2, jitter: 0.9 },
    speed: 1.3,
    path: {
      y: { base: -6, jitter: -50 },
      r: { base: 6, jitter: 14 },
      speed: { base: 0.14, jitter: 0.12 },
      phase: ANY_HEADING,
      z: { base: -9, jitter: -18 },
    },
  },
  {
    model: "fish",
    count: 6,
    length: { base: 3, jitter: 2 },
    speed: 0.6,
    tint: { darken: 0.35, emissive: DARK_FISH_GLOW },
    path: {
      y: { base: -120, step: -26 },
      r: 18,
      speed: 0.05,
      phase: { step: 1.3 },
      z: { base: -16, jitter: -10 },
    },
  },
  {
    model: "jelly",
    count: 16,
    length: { base: 2.6, jitter: 2.6 },
    speed: 0.8,
    tint: {
      emissive: JELLY_GLOW,
      emissiveIntensity: 1.2,
      opacity: 0.78,
      depthWrite: false,
    },
    drift: {
      x: { base: -17, jitter: 34 },
      y: { base: -60, jitter: -200 },
      z: { base: -10, jitter: -26 },
      phase: ANY_HEADING,
    },
  },
  {
    model: "turtle",
    count: 2,
    length: { base: 3.2, step: -1 },
    speed: 0.6,
    path: {
      meters: { base: 50, step: 70 },
      r: { base: 12, step: 6 },
      speed: 0.045,
      phase: { step: 3 },
      z: -16,
    },
  },
  {
    model: "dolphin",
    count: 3,
    length: 3,
    path: {
      y: { base: -7, step: -1.5 },
      r: 18,
      speed: 0.13,
      phase: { step: 0.35 },
      z: { base: -22, step: -2 },
    },
  },
  {
    model: "manta",
    length: 6,
    speed: 0.7,
    path: { meters: 150, r: 20, speed: 0.035, phase: 1, z: -24 },
  },
  {
    model: "shark",
    count: 2,
    length: { base: 6.5, step: -1.5 },
    speed: 0.9,
    path: {
      meters: { base: 420, step: 330 },
      r: { base: 15, step: 6 },
      speed: 0.07,
      phase: { step: 2.6 },
      z: -18,
    },
  },
  {
    model: "hammerheads",
    length: 20,
    path: { meters: 800, r: 22, speed: 0.025, phase: 4, z: -26 },
  },
  {
    model: "humpback",
    length: 22,
    speed: 0.5,
    rot: FACE_SIDEWAYS,
    path: { meters: 300, r: 46, speed: 0.016, phase: 2, z: -70 },
  },
  {
    model: "glass-octopus",
    count: 2,
    length: 3.4,
    tint: { emissive: OCTOPUS_GLOW, emissiveIntensity: 0.45, opacity: 0.88 },
    drift: {
      x: { base: -9, step: 18 },
      meters: { base: 1500, step: 1100 },
      z: { base: -12, step: -4 },
      phase: { step: 2 },
    },
  },
  {
    model: "angler2",
    count: 2,
    length: { base: 3.2, step: -0.8 },
    rot: FACE_SIDEWAYS,
    lure: { size: { base: 1.6, step: -0.5 }, at: [0, 1.2, 1.8] },
    path: {
      meters: { base: 4400, step: 900 },
      r: { base: 8, step: 4 },
      speed: 0.06,
      phase: { step: 2.5 },
      z: -14,
    },
  },
  {
    model: "alien-fish",
    count: 3,
    length: { base: 2, step: 0.5 },
    tint: { ownGlow: 2.2, emissive: ALIEN_GLOW, emissiveIntensity: 0.6 },
    path: {
      meters: { base: 4100, step: 700 },
      r: { base: 6, step: 3 },
      speed: 0.09,
      phase: { step: 1.9 },
      z: { base: -10, step: -4 },
    },
  },
];

// At the seabed the chat covers the middle of the screen, so the props sit to both sides of it.
const STAR_SCATTER = {
  x: { base: 7, jitter: 10 },
  y: 1.4,
  z: { base: -5, jitter: -14 },
  ry: ANY_HEADING,
  mirror: true,
};

/** Props on the sand, in the seabed's own coordinates. */
export const BED_PROPS: BedProp[] = [
  {
    model: "whale-fall",
    length: 20,
    ground: true,
    places: [{ x: 19, y: 0.6, z: -30, ry: -0.4 }],
  },
  {
    model: "ginnanmaru",
    length: 18,
    ground: true,
    tint: { emissive: WRECK_GLOW, glowMap: true, emissiveIntensity: 0.45 },
    places: [{ x: -15.5, y: -0.5, z: -25, ry: 1.45 }],
  },
  {
    model: "helmet",
    length: 1.3,
    ground: true,
    places: [{ x: -8, y: 1.4, z: -8, ry: 2.4 }],
  },
  {
    model: "isopod",
    length: 1.5,
    ground: true,
    places: [{ x: -10.5, y: 1.3, z: -7, ry: 0.9 }],
  },
  {
    model: "star",
    length: { base: 0.9, jitter: 0.5 },
    rot: LIE_FLAT,
    ground: true,
    count: 4,
    places: [STAR_SCATTER],
  },
  {
    model: "star-cushion",
    length: { base: 0.9, jitter: 0.5 },
    ground: true,
    count: 4,
    places: [STAR_SCATTER],
  },
  {
    model: "coral-stylaster",
    length: 4.5,
    ground: true,
    places: [
      { x: 13, y: 0.6, z: -13, ry: ANY_HEADING },
      { x: -17, y: 0.6, z: -12, ry: ANY_HEADING },
      { x: 19, y: 0.6, z: -22, ry: ANY_HEADING },
    ],
  },
  {
    model: "coral-soft",
    length: 7,
    ground: true,
    places: [
      { x: -9, y: 0.6, z: -14, ry: ANY_HEADING },
      { x: -21, y: 0.6, z: -24, ry: ANY_HEADING },
      { x: 11, y: 0.6, z: -20, ry: ANY_HEADING },
    ],
  },
  {
    model: "seahorse",
    length: 1.2,
    speed: 0.7,
    places: [{ x: 11, y: 3, z: -12, ry: -0.6 }],
  },
  {
    model: "seadragon",
    length: 1.8,
    speed: 0.6,
    places: [{ x: -8, y: 3.5, z: -9, ry: 0.8 }],
  },
];
