import type * as Three from "three";
import {
  GATE,
  IDLE_AGE,
  LANTERNS,
  SONAR,
} from "#/constants/seaScene.constants";
import type { SeaPassage } from "#/types/sea.types";
import type { Kit } from "#/types/seaScene.types";
import { gateOpacity, lanternFrame, ringFrame } from "#/utils/markers.utils";
import { glowSprite } from "./glow";

interface Lantern {
  sprite: Three.Sprite;
  age: number;
  up: boolean;
  y0: number;
}

/** What the stream draws in the water: sonar rings, the passages' lanterns and the score gate. */
export function markers(kit: Kit) {
  const { THREE, keep, color, scene } = kit;
  const glow = color("--color-glow");
  const coral = color("--color-coral");
  const rings = Array.from({ length: SONAR.count }, () => {
    const mesh = new THREE.Mesh(
      keep(new THREE.RingGeometry(SONAR.inner, 1, SONAR.segments)),
      keep(
        new THREE.MeshBasicMaterial({
          color: glow,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    );
    scene.add(mesh);
    return { mesh, age: IDLE_AGE };
  });
  const lanterns: Lantern[] = Array.from({ length: LANTERNS.count }, () => {
    const sprite = glowSprite(kit, glow, LANTERNS.size, 0);
    sprite.material.fog = false;
    scene.add(sprite);
    return { sprite, age: IDLE_AGE, up: true, y0: 0 };
  });
  const gate = new THREE.Line(
    keep(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-GATE.halfWidth, 0, 0),
        new THREE.Vector3(GATE.halfWidth, 0, 0),
      ]),
    ),
    keep(
      new THREE.LineDashedMaterial({
        color: color("--color-foam"),
        transparent: true,
        opacity: 0,
        dashSize: GATE.dash,
        gapSize: GATE.gap,
        fog: false,
      }),
    ),
  );
  gate.computeLineDistances();
  scene.add(gate);
  let gateAge = IDLE_AGE;

  return {
    ping(y: number): void {
      const ring = rings.find((item) => item.age > SONAR.life) ?? rings[0];
      ring.age = 0;
      ring.mesh.position.set(0, y, SONAR.z);
    },
    /** One lantern per passage, set by its score against the threshold; `settled` skips the motion. */
    show(
      y: number,
      passages: SeaPassage[],
      threshold: number,
      settled: boolean,
    ) {
      gate.position.set(0, y, GATE.z);
      gateAge = 0;
      const shown = passages.slice(0, lanterns.length);
      shown.forEach((passage, i) => {
        const l = lanterns[i];
        l.age = settled ? LANTERNS.settledAge : 0;
        l.up = passage.above_threshold;
        l.y0 = y + (passage.score - threshold) * LANTERNS.scoreHeight;
        const x = (i / Math.max(shown.length - 1, 1) - 0.5) * LANTERNS.width;
        l.sprite.position.set(x, l.y0, LANTERNS.z);
        l.sprite.material.color.copy(passage.above_threshold ? glow : coral);
        const s = 1 + passage.score * LANTERNS.scoreSize;
        l.sprite.scale.set(s, s, 1);
      });
    },
    frame(dt: number, t: number): void {
      for (const ring of rings) {
        ring.age += dt;
        const f = ringFrame(ring.age);
        ring.mesh.visible = f.visible;
        ring.mesh.scale.setScalar(f.scale);
        ring.mesh.material.opacity = f.opacity;
      }
      gateAge += dt;
      gate.material.opacity = gateOpacity(gateAge);
      lanterns.forEach((l, i) => {
        l.age += dt;
        const f = lanternFrame(l.age, t, i, l.up);
        l.sprite.position.y = l.y0 + f.dy;
        l.sprite.position.z = LANTERNS.z + f.dz;
        l.sprite.material.opacity = f.opacity;
      });
    },
    reset(): void {
      for (const ring of rings) ring.age = IDLE_AGE;
      for (const l of lanterns) {
        l.age = IDLE_AGE;
        l.sprite.material.opacity = 0;
      }
      gateAge = IDLE_AGE;
    },
  };
}
