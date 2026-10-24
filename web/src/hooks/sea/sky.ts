import type * as Three from "three";
import { SKY_DOME } from "#/constants/seaScene.constants";
import { SKY_FRAGMENT, SKY_VERTEX } from "#/constants/seaShaders.constants";
import type { Kit, SkyUniforms, ThreeModule } from "#/types/seaScene.types";

/** Sun and sky colours, shared with the ocean so it reflects the same sky. */
export function skyUniforms(
  THREE: ThreeModule,
  time: Three.IUniform<number>,
): SkyUniforms {
  const { sunDirection, colors } = SKY_DOME;
  return {
    uSun: { value: new THREE.Vector3(...sunDirection).normalize() },
    uZen: { value: new THREE.Color(colors.zenith) },
    uHor: { value: new THREE.Color(colors.horizon) },
    uHaze: { value: new THREE.Color(colors.haze) },
    uSunCol: { value: new THREE.Color(colors.sun) },
    uTime: time,
  };
}

export function skyDome(
  { THREE, keep }: Kit,
  uniforms: SkyUniforms,
): Three.Mesh {
  return new THREE.Mesh(
    keep(
      new THREE.SphereGeometry(
        SKY_DOME.radius,
        SKY_DOME.widthSegments,
        SKY_DOME.heightSegments,
      ),
    ),
    keep(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms,
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
      }),
    ),
  );
}
