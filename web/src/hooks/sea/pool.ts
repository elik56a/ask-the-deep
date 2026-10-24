import type * as Three from "three";
import { POOL_MOTION } from "#/constants/seaScene.constants";
import { POOL_FRAGMENT, POOL_VERTEX } from "#/constants/seaShaders.constants";
import type { Kit, Pool } from "#/types/seaScene.types";

/** Bubbles rise and sand settles; a ring buffer, so emitting never allocates. */
export function pool(
  { THREE, keep, scene }: Kit,
  count: number,
  color: Three.Color,
  size: number,
): Pool {
  const m = POOL_MOTION;
  const position = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const velocity = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const points = new THREE.Points(
    geometry,
    keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uColor: { value: color }, uSize: { value: size } },
        vertexShader: POOL_VERTEX,
        fragmentShader: POOL_FRAGMENT,
      }),
    ),
  );
  points.frustumCulled = false;
  scene.add(points);
  let next = 0;
  const flag = () => {
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  };
  const jitter = (spread: number) => (Math.random() - 0.5) * spread;
  return {
    emit(n, at, spread, rise, sideways) {
      for (let k = 0; k < n; k++) {
        const i = next;
        next = (next + 1) % count;
        position.set(
          [
            at.x + jitter(spread),
            at.y + jitter(spread * m.flatten),
            at.z + jitter(spread),
          ],
          i * 3,
        );
        velocity.set(
          [
            jitter(sideways),
            rise * (m.minSpeed + Math.random() * m.jitter),
            jitter(sideways),
          ],
          i * 3,
        );
        life[i] = 1;
      }
    },
    step(dt, gravity) {
      const damp = 1 - dt * m.damping;
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) {
          alpha[i] = 0;
          continue;
        }
        life[i] -= dt * m.fade;
        velocity[i * 3 + 1] += gravity * dt;
        velocity[i * 3] *= damp;
        velocity[i * 3 + 2] *= damp;
        position[i * 3] +=
          velocity[i * 3] * dt +
          Math.sin(life[i] * m.wobbleRate + i) * m.wobble;
        position[i * 3 + 1] += velocity[i * 3 + 1] * dt;
        position[i * 3 + 2] += velocity[i * 3 + 2] * dt;
        alpha[i] = Math.max(life[i], 0);
      }
      flag();
    },
    clear() {
      life.fill(0);
      alpha.fill(0);
      flag();
    },
  };
}
