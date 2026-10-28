import type * as Three from "three";
import { LITE, OCEAN_PLANE, WAVES } from "#/constants/seaScene.constants";
import {
  OCEAN_FRAGMENT,
  OCEAN_VERTEX,
  WAVES_SLOT,
} from "#/constants/seaShaders.constants";
import type { Kit, SkyUniforms } from "#/types/seaScene.types";
import { waveGlsl } from "#/utils/wave.utils";

export type Ocean = Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial>;

/** The swell, seen from above and from below; `uUnder` follows the water colour. */
export function ocean({ THREE, keep, lite }: Kit, sky: SkyUniforms): Ocean {
  const segments = lite ? LITE.oceanSegments : OCEAN_PLANE.segments;
  const geometry = keep(
    new THREE.PlaneGeometry(
      OCEAN_PLANE.size,
      OCEAN_PLANE.size,
      segments,
      segments,
    ),
  );
  geometry.rotateX(-Math.PI / 2);
  const material = keep(
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        ...sky,
        uDeep: { value: new THREE.Color(OCEAN_PLANE.colors.deep) },
        uMid: { value: new THREE.Color(OCEAN_PLANE.colors.mid) },
        uUnder: { value: new THREE.Color() },
      },
      vertexShader: OCEAN_VERTEX.replace(WAVES_SLOT, waveGlsl(WAVES)),
      fragmentShader: OCEAN_FRAGMENT,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
