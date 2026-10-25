import type * as Three from "three";
import {
  IDLE_AGE,
  SPLASH_RINGS,
  SPRAY,
  WAVES,
} from "#/constants/seaScene.constants";
import type { Kit } from "#/types/seaScene.types";
import { foamRingFrame } from "#/utils/markers.utils";
import { waveAt } from "#/utils/wave.utils";
import { pool } from "./pool";

/** Where the diver goes in: spray thrown up and falling back, and foam rings riding the swell. */
export function splashRig(kit: Kit) {
  const { THREE, keep, color, scene, glow } = kit;
  const foam = color("--color-foam");
  const spray = pool(kit, SPRAY.pool, foam, SPRAY.size);
  const flat = (geometry: Three.BufferGeometry, map: Three.Texture | null) => {
    const mesh = new THREE.Mesh(
      keep(geometry),
      keep(
        new THREE.MeshBasicMaterial({
          color: foam,
          map,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: false,
        }),
      ),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  };
  const rings = SPLASH_RINGS.delays.map((delay) => ({
    mesh: flat(new THREE.RingGeometry(SPLASH_RINGS.inner, 1, 72), null),
    delay,
  }));
  const patch = flat(new THREE.CircleGeometry(1, 48), glow);
  const at = new THREE.Vector3();
  let age = IDLE_AGE;

  return {
    start(where: Three.Vector3, quiet: boolean): void {
      at.copy(where);
      age = 0;
      if (quiet) return;
      const s = SPRAY;
      spray.emit(s.count, at, s.spread, s.rise, s.sideways);
    },
    frame(dt: number, t: number): void {
      age += dt;
      at.y = waveAt(WAVES, at.x, at.z, t).h + SPLASH_RINGS.lift;
      for (const { mesh, delay } of rings) {
        const f = foamRingFrame(age - delay);
        mesh.visible = f.visible;
        if (!f.visible) continue;
        mesh.position.copy(at);
        mesh.scale.setScalar(f.scale);
        mesh.material.opacity = f.opacity;
      }
      const f = foamRingFrame(age);
      patch.visible = f.visible;
      patch.position.copy(at);
      patch.scale.setScalar(SPLASH_RINGS.patchSize * f.scale * 0.5);
      patch.material.opacity = f.opacity;
      spray.step(dt, SPRAY.gravity);
    },
    clear(): void {
      age = IDLE_AGE;
      spray.clear();
    },
  };
}
