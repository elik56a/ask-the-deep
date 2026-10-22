import type * as Three from "three";
import { SHAFT_KEYS } from "#/constants/sea.constants";
import { SHAFTS } from "#/constants/seaScene.constants";
import { SHAFT_FRAGMENT, SHAFT_VERTEX } from "#/constants/seaShaders.constants";
import type { Kit } from "#/types/seaScene.types";
import { keyframe } from "#/utils/depth.utils";
import { oscillate } from "#/utils/ease.utils";
import { spreadAt } from "#/utils/spread.utils";

/** Sunlight shafts below the surface, fading out with depth. */
export function shafts({ THREE, keep, color, scene }: Kit) {
  const material = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uOpacity: { value: 0 },
        uCol: { value: color("--color-shaft") },
      },
      vertexShader: SHAFT_VERTEX,
      fragmentShader: SHAFT_FRAGMENT,
    }),
  );
  const rays: Three.Mesh[] = Array.from({ length: SHAFTS.count }, (_, i) => {
    const ray = new THREE.Mesh(
      keep(
        new THREE.ConeGeometry(
          spreadAt(SHAFTS.radius, i, Math.random()),
          SHAFTS.height,
          SHAFTS.radialSegments,
          1,
          true,
        ),
      ),
      material,
    );
    ray.position.set(
      spreadAt(SHAFTS.x, i, Math.random()),
      SHAFTS.y,
      spreadAt(SHAFTS.z, i, Math.random()),
    );
    ray.userData.phase = spreadAt(SHAFTS.phase, i, Math.random());
    scene.add(ray);
    return ray;
  });
  return {
    frame(zone: number, under: boolean, t: number): void {
      material.uniforms.uOpacity.value = under ? keyframe(zone, SHAFT_KEYS) : 0;
      for (const ray of rays) {
        ray.rotation.z = oscillate(
          SHAFTS.tilt,
          SHAFTS.sway,
          SHAFTS.swayRate,
          t,
          ray.userData.phase,
        );
      }
    },
  };
}
