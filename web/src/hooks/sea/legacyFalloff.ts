import { LEGACY_ATTENUATION } from "#/constants/seaShaders.constants";
import type { ThreeModule } from "#/types/seaScene.types";

const MODERN = /float getDistanceAttenuation\([\s\S]*?\n}/;

/**
 * Swaps three's physical light falloff for r128's, which the sea and the helm were tuned with,
 * so their point and spot lights keep the prototype's distances and decays as they are.
 * Call before any material compiles; calling again changes nothing.
 */
export function legacyFalloff(THREE: ThreeModule): void {
  const chunk = THREE.ShaderChunk.lights_pars_begin;
  if (chunk.includes(LEGACY_ATTENUATION)) return;
  THREE.ShaderChunk.lights_pars_begin = chunk.replace(
    MODERN,
    LEGACY_ATTENUATION,
  );
}
