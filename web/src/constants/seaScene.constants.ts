import type { Wave } from "#/types/wave.types";

// The 3D sea's tuning, from the v3 prototype. Colours are sRGB hex; distances are world units.

// three r155+ dropped the PI factor of legacy lights; the scene was tuned with it.
export const LEGACY_LIGHT = Math.PI;

// The surface swell, shared by the ocean shader, the camera's bob, the diver and the boat.
export const WAVES: Wave[] = [
  [1, 0.2, 0.12, 0.5, 0.7],
  [0.3, 1, 0.18, 0.3, 0.55],
  [-0.6, 0.8, 0.37, 0.12, 1.25],
  [0.9, -0.4, 0.83, 0.05, 1.9],
  [-0.2, -1, 1.6, 0.02, 2.6],
];

export const CAMERA = {
  fov: 55,
  // Portrait screens get a wider lens below this aspect.
  narrowFov: 70,
  narrowAspect: 0.8,
  near: 0.1,
  far: 1500,
  z: 8,
  // How far the mouse sways the camera and its aim.
  sway: 0.9,
  lookSway: 0.4,
  lookTilt: 0.3,
  lookZ: -30,
  lookDropUnder: 0.4,
  lookDropAbove: 0.55,
  // The camera rides the swell at this point, at this share of its height.
  bobAt: { x: 0, z: 8 },
  bob: 0.35,
} as const;

// While the step log is in view (diving, rereading) the scene centres in the water beyond it,
// on wide screens: the log starts at the 32 px gutter and a card ends 684 px past it.
export const LOG_SHIFT = {
  minWidth: 1024,
  logStart: 32,
  cardEnd: 684,
} as const;

// The camera is underwater below this height.
export const UNDER_Y = -0.4;
// The water fades in over a band around the waterline instead of switching there (P5.40):
// dry above `dryY`, fully wet `band` lower, eased at `rate` per second.
export const WET = { dryY: 0.6, band: 2.4, rate: 6 } as const;
// Breaking the surface on the way up: a burst of bubbles and a foam wash draining down the view.
export const SURFACING = {
  dy: -2.5,
  z: -5,
  count: 140,
  spread: 8,
  rise: 4.5,
  sideways: 2.5,
} as const;
export const FOAM = {
  durationMs: 1600,
  peak: 0.85,
  peakAt: 0.25,
  fromY: "10%",
  peakY: "40%",
  toY: "150%",
  // Out fast to the peak, then falling away like water draining off.
  easeIn: "cubic-bezier(0.55, 0, 0.75, 0.6)",
} as const;
// Per-second rates of the exponential eases.
export const EASE_RATE = {
  pointer: 3,
  lift: 1.5,
  land: 1.2,
  lamp: 5,
} as const;
// The view offset is only reset when the lift moves more than this many px.
export const LIFT_EPSILON_PX = 0.5;
// Scrolling this many zones down starts loading the deep models, in case no dive did.
export const DEEP_LOAD_ZONE = 0.25;
// Creatures animate only within this height of the camera.
export const ANIMATE_RANGE = 70;
// Past this height from the camera the fog has swallowed a model, so it is not drawn.
export const VISIBLE_RANGE = 105;

export const SKY_DOME = {
  radius: 900,
  widthSegments: 48,
  heightSegments: 24,
  sunDirection: [0.22, 0.12, -1],
  colors: {
    zenith: 0x2f78ae,
    horizon: 0xa9d4e8,
    haze: 0xf2cfa8,
    sun: 0xffe2b8,
  },
} as const;

export const OCEAN_PLANE = {
  size: 1600,
  segments: 280,
  colors: { deep: 0x06324a, mid: 0x14708c },
} as const;

// Point and spot lights use r128's falloff (hooks/sea/legacyFalloff.ts): linear to `distance`,
// shaped by `decay`, exactly as in the prototype.
export const HEMI = {
  sky: 0xcfeaf5,
  deepSky: 0x4f86b3,
  // Below this zone the sky light turns deep blue.
  deepZone: 1,
  surface: 1.15,
} as const;
export const SUN_LIGHT = {
  color: 0xfff0d6,
  surface: 0.9,
  position: [12, 40, -20],
} as const;
export const LAMP = {
  distance: 36,
  decay: 1.2,
  position: [0, 0.5, 1],
  // Below this zone the lamp stays on low; the stream turns it up.
  deepZone: 1.1,
  deep: 0.9,
  on: 1.4,
} as const;
export const TORCH = {
  color: 0xd8f6ff,
  distance: 110,
  decay: 1,
  angle: 0.6,
  penumbra: 0.7,
  position: [0.6, -0.4, 0],
  target: [0, -2.5, -20],
} as const;
export const DIVER_LAMP = {
  color: 0xd8f6ff,
  distance: 14,
  intensity: 1.6,
  decay: 1.6,
  offset: [1.5, 2.5, 4],
} as const;
export const LURE = {
  distance: 18,
  decay: 1.4,
  intensity: 1.4,
  flicker: 0.3,
  flickerRate: 2.4,
} as const;

export const SHAFTS = {
  count: 9,
  radius: { base: 3, jitter: 3 },
  height: 70,
  radialSegments: 10,
  x: { base: -30, step: 7.5, jitter: 3 },
  y: -36,
  z: { base: -14, jitter: -34 },
  phase: { jitter: 6 },
  tilt: -0.2,
  sway: 0.05,
  swayRate: 0.25,
} as const;

// Marine snow and glowing specks: counts, height range, size and drift.
export const SNOW = { count: 2000, from: -340, to: -10, size: 0.22 } as const;
export const SPECKS = { count: 900, from: -340, to: -90, size: 0.6 } as const;
export const PARTICLE_FIELD = {
  width: 70,
  zFrom: -2,
  depth: 60,
  opacity: { glow: 0.9, plain: 0.5 },
  driftX: 0.8,
  driftXRate: 0.08,
  driftY: 1.2,
  driftYRate: 0.05,
  twinkle: 0.2,
  twinkleRate: 1.3,
  twinkleBase: 0.7,
} as const;

export const BUBBLES = { count: 480, size: 0.5, gravity: 1.5 } as const;
export const DUST = { count: 220, size: 0.9, gravity: -0.6 } as const;
// A pooled particle's life drains at this rate per second; its sideways speed damps.
export const POOL_MOTION = {
  fade: 0.35,
  damping: 0.8,
  wobble: 0.01,
  wobbleRate: 9,
  // Keeps a rising bubble's footprint flat: spread in y is this share of x and z.
  flatten: 0.4,
  // Speed varies from this share of the burst's to that plus `jitter`.
  minSpeed: 0.6,
  jitter: 0.8,
} as const;
// Bubbles where the camera breaks the surface, and at each streamed chunk.
export const SPLASH = {
  dy: -1.5,
  z: -5,
  count: 70,
  spread: 6,
  rise: 3,
  sideways: 2,
} as const;
export const STREAM_BUBBLES = {
  spreadX: 4,
  dy: -3,
  z: -6,
  spread: 2,
  rise: 2.6,
  sideways: 0.6,
} as const;
// Sand thrown up when the camera reaches the seabed.
export const LANDING_DUST = {
  within: 1.5,
  dy: 1.5,
  z: -12,
  count: 110,
  spread: 14,
  rise: 1.2,
  sideways: 4,
} as const;

// Sand ripples: height += amp × sin(ax·x + az·z + phase).
export const SAND_RIPPLES: readonly (readonly [
  number,
  number,
  number,
  number,
])[] = [
  [0.08, 0, 1.6, 0],
  [0.03, 0.11, 1.3, Math.PI / 2],
  [0.31, 0.27, 0.45, 0],
];
export const SEABED = {
  width: 260,
  depth: 200,
  segmentsX: 64,
  segmentsZ: 50,
  roughness: 0.95,
  // The sand sits this far below the camera at the seabed.
  belowEye: 9,
  // Where the sand waits before a dive lands somewhere, in meters.
  restMeters: 5600,
} as const;
export const ROCKS = {
  count: 10,
  detail: 2,
  roughness: 0.9,
  scale: { base: 0.5, jitter: 1.6 },
  stretchX: { base: 1, jitter: 0.6 },
  squashY: { base: 0.6, jitter: 0.5 },
  spin: { jitter: 3 },
  x: { base: -40, jitter: 80 },
  y: 0.2,
  z: { base: -18, jitter: -40 },
} as const;
// Small glowing marks on the sand, every third one coral.
export const BED_MARKS = {
  count: 22,
  coralEvery: 3,
  size: 0.7,
  opacity: 0.7,
  x: { base: -25, jitter: 50 },
  y: { base: 1, jitter: 1.5 },
  z: { base: -6, jitter: -40 },
  pulse: 0.3,
  pulseBase: 0.45,
  pulseRate: 1.2,
} as const;
// A lander's floodlight and a warm fill on the seabed; both come up once landed.
export const FLOOD = {
  color: 0xd9efff,
  distance: 140,
  decay: 1,
  angle: 0.85,
  penumbra: 0.65,
  position: [4, 42, 6],
  target: [0, 0, -22],
  base: 3.2,
  landed: 2.6,
} as const;
export const WARM = {
  color: 0xffc98a,
  distance: 40,
  decay: 1.4,
  position: [-6, 9, -16],
  base: 1.4,
  landed: 1.2,
} as const;
// Seabed creatures animate once the camera is this many zones down.
export const BED_LIFE_ZONE = 3;

// Sonar rings at each model call.
export const SONAR = {
  count: 2,
  inner: 0.94,
  segments: 72,
  life: 1.6,
  startScale: 0.5,
  growth: 16,
  opacity: 0.8,
  z: -10,
} as const;
// Lanterns: one per retrieved passage, rising above the score gate or sinking below it.
export const LANTERNS = {
  count: 8,
  size: 1.6,
  life: 14,
  rise: 2.2,
  fadeIn: 1.5,
  fadeOut: 2,
  bob: 0.2,
  bobRate: 1.4,
  forward: 4,
  glow: 0.85,
  flicker: 0.15,
  flickerRate: 3,
  sink: 5,
  dimFrom: 0.65,
  dimBy: 0.45,
  // Reduced motion shows them settled, this many seconds in.
  settledAge: 3,
  width: 18,
  z: -15,
  // Height per unit of score above or below the threshold, and size per unit of score.
  scoreHeight: 14,
  scoreSize: 2.2,
} as const;
// The retrieval score gate drawn as a thermocline.
export const GATE = {
  halfWidth: 11,
  dash: 0.5,
  gap: 0.35,
  z: -13,
  life: 9,
  fadeInRate: 2,
  opacity: 0.5,
  fadeOutFrom: 7,
  fadeOut: 2,
} as const;
// Any age past every effect's life: the effect is idle.
export const IDLE_AGE = 99;

export const DIVER = {
  length: 3,
  // The diver sits this far in front of the camera, which sets the frame's half width.
  frameDepth: 9,
  wideAspect: 1.2,
  restShare: { wide: 0.32, narrow: 0.45 },
  restY: -1.1,
  restSwellZ: -1,
  restSwell: 0.6,
  // Wide screens: underwater the diver keeps left of centre, clear of the step cards.
  diveX: -1.4,
  below: 2.1,
  restZ: -1,
  diveZ: -3,
  // Head-down attitude while diving: the body's up axis.
  diveUp: [0.3, -0.95, 0],
  // Landed: beside the chat at this share of the half width, turned towards it.
  hoverShare: 0.88,
  hoverPitch: 0.12,
  hoverTurn: -0.8,
  hoverEpsilon: 0.001,
  // Fins kick faster while diving.
  kick: 0.6,
} as const;

// The giant stride (pre-dive): the camera drops toward the waterline, the diver swims up close,
// then leaps head first into the water and the dive starts as he goes under.
export const STRIDE = {
  // Lower on narrow screens, so the diver stands high in the frame above the slate.
  camDrop: { wide: 1.3, narrow: 1.9 },
  readyRate: 2.4,
  // Close up, this far in front of the camera, at this share of the half width; head and
  // shoulders clear of the water, turned three-quarters towards the slate.
  heroDepth: 4.8,
  heroShare: { wide: 0.4, narrow: 0 },
  heroY: -0.3,
  heroYaw: -0.7,
  heroSwell: 0.35,
  // Seconds: sinking into the swell, the arc through the air, the slide under.
  crouchS: 0.3,
  flightS: 0.7,
  sinkS: 0.8,
  crouch: 0.45,
  rise: 1.7,
  // The leap carries this far towards the middle and away from the camera.
  reachX: -1.2,
  reachZ: -2.6,
  sink: 2.4,
  // The arc's highest point, as a share of the flight.
  peakAt: 0.4,
  // The share of the flight when the head breaks the water and the dive starts.
  entryAt: 0.62,
  // If frames stall, the dive starts this long after the head should have gone under.
  entryGraceMs: 250,
  // Heading at take-off: facing the water ahead, away from the camera.
  leapYaw: -2.7,
  // Bubbles trail from the diver while he slides under.
  trailEvery: 0.04,
  trail: { count: 3, spread: 0.6, rise: 2.2, sideways: 0.4 },
} as const;
// The entry: spray thrown up and falling back, foam rings spreading on the swell.
export const SPRAY = {
  pool: 160,
  size: 0.45,
  gravity: -9,
  count: 110,
  spread: 0.9,
  rise: 6.5,
  sideways: 3.2,
} as const;
export const SPLASH_RINGS = {
  inner: 0.82,
  delays: [0, 0.18, 0.4],
  lifeS: 1.5,
  from: 0.4,
  to: 3.4,
  opacity: 0.85,
  // The white water left where he went in, under the rings.
  patchSize: 2.2,
  lift: 0.03,
} as const;
// Going under: froth rises up the view as the water closes over the lens.
export const PLUNGE = {
  durationMs: 900,
  peak: 0.5,
  peakAt: 0.3,
  fromY: "150%",
  peakY: "45%",
  toY: "-10%",
} as const;

export const SWIM = {
  bob: 0.8,
  bobRate: 1.7,
  swing: 7,
  swingRate: 0.8,
} as const;
export const DRIFT = {
  sway: 2,
  swayRate: 0.1,
  bob: 1.6,
  bobRate: 0.35,
  turnRate: 0.05,
} as const;
export const LOOP = {
  rx: 18,
  rz: 6,
  bob: 1.2,
  bobRate: 2.1,
} as const;

// Other divers on the way down: the same model swimming flat, each with a torch.
export const OTHER_DIVERS = {
  at: [
    { x: -14, y: -58, z: -22, speed: 0.05 },
    { x: 12, y: -96, z: -30, speed: 0.04 },
    { x: -8, y: -150, z: -26, speed: 0.035 },
  ],
  speed: 0.8,
  rot: [Math.PI / 2, 0, 0],
  phaseStep: 2.2,
  range: 60,
  torch: {
    color: 0xfff1cf,
    intensity: 2.2,
    decay: 1.4,
    distance: 26,
    beam: 2.4,
    beamOpacity: 0.9,
    at: [0, 0, 1.6],
  },
  puff: {
    first: 2,
    every: 1.4,
    jitter: 1,
    dy: 0.8,
    count: 5,
    spread: 0.6,
    rise: 2.2,
    sideways: 0.4,
  },
} as const;

export const BOAT = {
  length: 11,
  sink: -1.1,
  position: [16, 0, -52],
  heading: -0.55,
  bob: 0.9,
  draft: -0.15,
  tilt: 0.6,
  // Seen from underwater only near the surface.
  hideBelow: -40,
} as const;

export const SUB = {
  length: 9,
  rot: [0, Math.PI / 2, 0],
  meters: 2300,
  z: -24,
  swing: 7,
  swingRate: 0.03,
  nose: {
    color: 0xe8fbff,
    intensity: 3.5,
    decay: 1.2,
    distance: 50,
    at: [9, 0, 0],
  },
  top: {
    color: 0xbfe0ff,
    intensity: 2,
    decay: 1.2,
    distance: 22,
    at: [0, 5, 3],
  },
  beam: { size: 5, opacity: 0.8, at: [7.8, 0, 0] },
} as const;

// Creature glows.
export const JELLY_GLOW = [0x2fd3c4, 0x6f88ff, 0xff7a55];
export const DARK_FISH_GLOW = 0x0c3a4a;
export const OCTOPUS_GLOW = 0x4fa8c8;
export const ALIEN_GLOW = 0x1d6f7a;

// Bounds of a posed model are sampled from about this many vertices per mesh.
export const POSE_SAMPLES = 300;
export const GLOW_TEXTURE = {
  size: 64,
  stops: [
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,.55)"],
    [1, "rgba(255,255,255,0)"],
  ],
} as const;
