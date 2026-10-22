import { SAND_RIPPLES } from "#/constants/seaScene.constants";

/** Height of the sand at (x, z): a sum of ripples. */
export function sandHeight(x: number, z: number): number {
  let h = 0;
  for (const [ax, az, amp, phase] of SAND_RIPPLES) {
    h += amp * Math.sin(ax * x + az * z + phase);
  }
  return h;
}
