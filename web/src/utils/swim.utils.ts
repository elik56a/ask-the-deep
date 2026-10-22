import { DRIFT, LOOP, SWIM } from "#/constants/seaScene.constants";
import type { Drift, Loop, Pose, SwimPath } from "#/types/seaScene.types";

/** Circling the view, facing the way it swims. */
export function pathPose(p: SwimPath, t: number): Pose {
  const a = t * p.speed + p.phase;
  return {
    x: Math.sin(a) * p.r,
    y: p.y + Math.sin(a * SWIM.bobRate) * SWIM.bob,
    z: p.z + Math.cos(a * SWIM.swingRate) * SWIM.swing,
    ry: Math.atan2(
      Math.cos(a) * p.r,
      -Math.sin(a * SWIM.swingRate) * SWIM.swing * SWIM.swingRate,
    ),
  };
}

/** Swaying in place and turning slowly. */
export function driftPose(d: Drift, t: number): Pose {
  return {
    x: d.x + Math.sin(t * DRIFT.swayRate + d.phase) * DRIFT.sway,
    y: d.y + Math.sin(t * DRIFT.bobRate + d.phase) * DRIFT.bob,
    z: d.z,
    ry: t * DRIFT.turnRate + d.phase,
  };
}

/** A wide loop around a point, facing the way it swims. */
export function loopPose(l: Loop, t: number): Pose {
  const a = t * l.speed + l.phase;
  return {
    x: l.x + Math.sin(a) * LOOP.rx,
    y: l.y + Math.sin(a * LOOP.bobRate) * LOOP.bob,
    z: l.z + Math.cos(a) * LOOP.rz,
    ry: Math.atan2(Math.cos(a) * LOOP.rx, -Math.sin(a) * LOOP.rz),
  };
}
