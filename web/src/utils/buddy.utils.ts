import { BUDDY } from "#/constants/sea.constants";
import type { BuddyPose, Extent } from "#/types/seaScene.types";
import { approach, oscillate } from "#/utils/ease.utils";

/** The fish's pace eases between a hard swim and an idle drift, so the change never snaps. */
export function buddyPace(pace: number, busy: boolean, dt: number): number {
  const to = busy ? BUDDY.busyPace : BUDDY.restPace;
  return approach(pace, to, BUDDY.paceRate, dt);
}

/** The model is long along X: a small turn off the side view gives it depth; it bobs with its pace. */
export function buddyPose(t: number, pace: number): BuddyPose {
  return {
    turn: oscillate(BUDDY.turn, BUDDY.sway, BUDDY.swayRate, t),
    bob: Math.sin(t * (1 + pace)) * BUDDY.bob,
  };
}

/** The scale that fits a model of `size` into `BUDDY.fill` of the camera's `view`. */
export function buddyScale(view: Extent, size: Extent): number {
  return BUDDY.fill * Math.min(view.x / size.x, view.y / size.y);
}
