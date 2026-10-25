import type * as Three from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { ModelId } from "#/types/models.types";
import type { SeaControls } from "#/types/sea.types";

export type ThreeModule = typeof Three;
export type Vec3 = readonly [number, number, number];
export type Keep = <T extends { dispose: () => void }>(item: T) => T;

/** What every part of the scene is built with. */
export interface Kit {
  THREE: ThreeModule;
  scene: Three.Scene;
  /** Registers a geometry, material or texture for disposal. */
  keep: Keep;
  /** A colour from the page's design tokens. */
  color: (token: string) => Three.Color;
  glow: Three.Texture;
}

export type SkyUniforms = Record<
  "uSun" | "uZen" | "uHor" | "uHaze" | "uSunCol" | "uTime",
  Three.IUniform
>;

export interface Addons {
  THREE: ThreeModule;
  loader: GLTFLoader;
  clone: typeof SkeletonUtils.clone;
}

export interface Sea {
  controls: SeaControls;
  dispose: () => void;
}

export type Loaded = Partial<Record<ModelId, GLTF>>;

/** A value per member of a group: base + index × step + random × jitter. */
export type Spread = number | { base?: number; step?: number; jitter?: number };

/** Circles the view: x on a radius, y bobbing, z swinging. */
export interface SwimPath {
  y: number;
  r: number;
  speed: number;
  phase: number;
  z: number;
}

/** Hangs in the water, swaying and slowly turning. */
export interface Drift {
  x: number;
  y: number;
  z: number;
  phase: number;
}

/** A wide loop around a point, for the other divers. */
export interface Loop {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Heading around y. */
  ry: number;
}

export interface Creature {
  root: Three.Group;
  /** Its meshes, hidden out of range; lights stay on so the shaders never recompile. */
  meshes: Three.Mesh[];
  mixer: Three.AnimationMixer;
  action: Three.AnimationAction | null;
  path?: SwimPath;
  drift?: Drift;
  loop?: Loop;
  /** Seconds until the next puff of bubbles. */
  puff?: number;
}

/** How a model's materials are recoloured, as plain data. */
export interface Tint {
  /** Multiplies the base colour. */
  darken?: number;
  /** One hex, or one per group member in turn. */
  emissive?: number | readonly number[];
  emissiveIntensity?: number;
  /** For models with their own emissive map: its intensity; the others get `emissive`. */
  ownGlow?: number;
  /** The base texture glows too, as photogrammetry scans carry their own light. */
  glowMap?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}

export interface Spawn {
  speed?: number;
  /** Turns the download so it faces +z and stands upright. */
  rot?: Vec3;
  /** Sets the model's lowest point at the root, for props on the sand. */
  ground?: boolean;
  tint?: Tint;
}

/** A path or drift height, in world units or in meters of depth. */
export type Height = { y: Spread } | { meters: Spread };

export type PathSpec = Height & {
  r: Spread;
  speed: Spread;
  phase: Spread;
  z: Spread;
};

export type DriftSpec = Height & { x: Spread; z: Spread; phase: Spread };

/** A group of one model swimming or drifting in the water column. */
export interface LifeGroup extends Spawn {
  model: ModelId;
  count?: number;
  length: Spread;
  path?: PathSpec;
  drift?: DriftSpec;
  /** A glowing lure on each member; the first one also carries a light. */
  lure?: { size: Spread; at: Vec3 };
}

export interface Place {
  x: Spread;
  y: Spread;
  z: Spread;
  ry: Spread;
  /** Alternates the side of x between members. */
  mirror?: boolean;
}

/** A prop on the seabed, set at each place `count` times. */
export interface BedProp extends Spawn {
  model: ModelId;
  length: Spread;
  count?: number;
  places: Place[];
}

export interface Pool {
  emit: (
    count: number,
    at: Three.Vector3,
    spread: number,
    rise: number,
    sideways: number,
  ) => void;
  step: (dt: number, gravity: number) => void;
  clear: () => void;
}

/** A burst of particles relative to a point. */
export interface Burst {
  count: number;
  spread: number;
  rise: number;
  sideways: number;
}

export interface RingFrame {
  visible: boolean;
  scale: number;
  opacity: number;
}

export interface LanternFrame {
  /** Offsets from the lantern's start. */
  dy: number;
  dz: number;
  opacity: number;
}

/** The diver's place and attitude during the giant stride: heading `yaw`, then `pitch` head first. */
export interface StridePose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface DiverPose {
  x: number;
  y: number;
  z: number;
  /** 0 at rest on the surface, 1 diving. */
  ease: number;
  /** How far the diver has turned to hover beside the chat. */
  hover: number;
}

/** Member `i` of a group that comes `count` times. */
export interface Member<T> {
  group: T;
  i: number;
}

/** One prop on the sand: member `i` of `prop` at `place`. */
export interface BedSlot {
  prop: BedProp;
  place: Place;
  i: number;
}
