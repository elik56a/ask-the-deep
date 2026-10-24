import { SURFACE_Y, WATERLINE_Y } from "#/constants/sea.constants";
import { DIVER, WAVES } from "#/constants/seaScene.constants";
import type { DiverPose } from "#/types/seaScene.types";
import { smoothstep } from "#/utils/depth.utils";
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
  const ease = smoothstep((SURFACE_Y - camY) / (SURFACE_Y - WATERLINE_Y));
  const halfW =
    Math.tan(((fov / 2) * Math.PI) / 180) * DIVER.frameDepth * aspect;
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
