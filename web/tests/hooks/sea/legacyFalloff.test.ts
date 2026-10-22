import * as THREE from "three";
import { expect, it } from "vitest";
import { LEGACY_ATTENUATION } from "#/constants/seaShaders.constants";
import { legacyFalloff } from "#/hooks/sea/legacyFalloff";

it("replaces three's light falloff with r128's, once", () => {
  legacyFalloff(THREE);
  legacyFalloff(THREE);
  const chunk = THREE.ShaderChunk.lights_pars_begin;
  expect(chunk.split(LEGACY_ATTENUATION)).toHaveLength(2);
  expect(chunk.match(/float getDistanceAttenuation/g)).toHaveLength(1);
});
