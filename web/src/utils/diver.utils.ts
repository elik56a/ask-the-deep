import { SURFACE_Y, WATERLINE_Y } from "#/constants/sea.constants";
import { CAMERA, DIVER, STRIDE, WAVES } from "#/constants/seaScene.constants";
import type { DiverPose, StridePose } from "#/types/seaScene.types";
import { smoothstep } from "#/utils/depth.utils";
import { clamp01 } from "#/utils/ease.utils";
import { waveAt } from "#/utils/wave.utils";

interface View {
  camY: number;
  t: number;
  aspect: number;
  /** Vertical field of view, in degrees. */
  fov: number;
  /** 1 in LTR, −1 in RTL: the diver floats on the side away from the hero. */
  side: number;
  /** 0 to 1 while landing on the sand. */
  landK: number;
}

const halfWidth = (fov: number, aspect: number, depth: number) =>
  Math.tan(((fov / 2) * Math.PI) / 180) * depth * aspect;

/** How far the camera has gone from the surface to the waterline: 0 above, 1 under. */
export function diveEase(camY: number): number {
  return smoothstep((SURFACE_Y - camY) / (SURFACE_Y - WATERLINE_Y));
}

/**
 * Where the diver is: floating on the swell at the surface, riding low in the frame
 * underwater (below the step cards), and beside the chat once landed.
 */
export function diverPose({
  camY,
  t,
  aspect,
  fov,
  side,
  landK,
}: View): DiverPose {
  const ease = diveEase(camY);
  const halfW = halfWidth(fov, aspect, DIVER.frameDepth);
  const wide = aspect > DIVER.wideAspect;
  const restX =
    side * halfW * (wide ? DIVER.restShare.wide : DIVER.restShare.narrow);
  const restY =
    DIVER.restY + waveAt(WAVES, restX, DIVER.restSwellZ, t).h * DIVER.restSwell;
  const diveX = wide ? DIVER.diveX * side : 0;
  const hover = landK > DIVER.hoverEpsilon && wide ? landK : 0;
  const x = restX + (diveX - restX) * ease;
  return {
    x: x + (side * halfW * DIVER.hoverShare - x) * hover,
    y: restY + (camY - DIVER.below - restY) * ease,
    z: DIVER.restZ + (DIVER.diveZ - DIVER.restZ) * ease,
    ease,
    hover,
  };
}

/** Ready to jump: close up on the free side of the slate, head and shoulders out of the swell. */
export function heroPose({
  t,
  aspect,
  fov,
  side,
}: Pick<View, "t" | "aspect" | "fov" | "side">): StridePose {
  const wide = aspect > DIVER.wideAspect;
  const share = wide ? STRIDE.heroShare.wide : STRIDE.heroShare.narrow;
  const x = side * halfWidth(fov, aspect, STRIDE.heroDepth) * share;
  const z = CAMERA.z - STRIDE.heroDepth;
  const swell = waveAt(WAVES, x, z, t).h * STRIDE.heroSwell;
  return {
    x,
    y: STRIDE.heroY + swell,
    z,
    yaw: STRIDE.heroYaw * side,
    pitch: 0,
  };
}

/** Whether the diver heads up: he follows the view while it moves, and keeps his heading while it rests. */
export function headsUp(was: boolean, rise: number, dt: number): boolean {
  if (dt <= 0 || Math.abs(rise / dt) < DIVER.flipSpeed) return was;
  return rise > 0;
}

/** 0 to 1: how hard he swims, from how fast the view moves. */
export function strokePace(rise: number, dt: number): number {
  if (!(dt > 0) || !Number.isFinite(rise)) return 0;
  return clamp01(Math.abs(rise / dt) / DIVER.strokeSpeed);
}

/** The swim cycle's speed: as made at the surface, slow while he hangs still underwater, faster with `pace`. */
export function strokeTimeScale(ease: number, pace: number): number {
  const under = DIVER.idleStroke + pace * DIVER.stroke;
  return 1 + (under - 1) * ease;
}

/** Seconds into the jump when the head breaks the water. */
export function strideEntryS(): number {
  return STRIDE.crouchS + STRIDE.flightS * STRIDE.entryAt;
}

/**
 * The giant stride `t` seconds in, from `hero`: he sinks into the swell and turns to the water,
 * arcs up and over head first, and slides under, still travelling away from the camera.
 */
export function stridePose(
  t: number,
  hero: StridePose,
  side: number,
): StridePose {
  const s = STRIDE;
  const crouch = smoothstep(t / s.crouchS);
  const u = clamp01((t - s.crouchS) / s.flightS);
  const w = clamp01((t - s.crouchS - s.flightS) / s.sinkS);
  const sink = 1 - (1 - w) ** 2;
  // y = v·u − g·u², peaking `rise` above the crouch at `peakAt` of the flight.
  const g = s.rise / (s.peakAt * s.peakAt);
  const arc = 2 * g * s.peakAt * u - g * u * u;
  const reach = u + sink * 0.3;
  const turn = smoothstep(t / (s.crouchS + s.flightS * s.peakAt));
  return {
    x: hero.x + side * s.reachX * reach,
    y: hero.y - s.crouch * crouch + arc - s.sink * sink,
    z: hero.z + s.reachZ * reach,
    yaw: hero.yaw + (s.leapYaw * side - hero.yaw) * turn,
    pitch: Math.PI * smoothstep(u),
  };
}
