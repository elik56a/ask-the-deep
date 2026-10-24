import type * as Three from "three";
import { WATER_KEYS } from "#/constants/sea.constants";
import type { Kit } from "#/types/seaScene.types";

/** The water colour at a zone, blended between the design tokens' keyframes. */
export function waterPalette({
  THREE,
  color,
}: Kit): (zone: number) => Three.Color {
  const keys = WATER_KEYS.map(([at, name]): [number, Three.Color] => [
    at,
    color(name),
  ]);
  const out = new THREE.Color();
  return (zone) => {
    const next = keys.findIndex(([at]) => zone <= at);
    if (next <= 0) return out.copy(keys[next === 0 ? 0 : keys.length - 1][1]);
    const [from, a] = keys[next - 1];
    const [to, b] = keys[next];
    return out.copy(a).lerp(b, (zone - from) / (to - from));
  };
}
