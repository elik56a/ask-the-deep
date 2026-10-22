import type * as Three from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { Creature, Kit, Spawn, Tint } from "#/types/seaScene.types";
import { posedBox } from "./models";

export type Spawner = (
  gltf: GLTF,
  length: number,
  options?: Spawn,
  index?: number,
) => Creature;

function applyTint(
  m: Three.MeshStandardMaterial,
  tint: Tint,
  index: number,
): void {
  if (tint.darken !== undefined) m.color.multiplyScalar(tint.darken);
  if (tint.ownGlow !== undefined && m.emissiveMap) {
    m.emissiveIntensity = tint.ownGlow;
  } else if (tint.emissive !== undefined) {
    const e = tint.emissive;
    m.emissive.setHex(typeof e === "number" ? e : e[index % e.length]);
    if (tint.emissiveIntensity !== undefined) {
      m.emissiveIntensity = tint.emissiveIntensity;
    }
  }
  if (tint.glowMap) m.emissiveMap = m.map;
  if (tint.opacity !== undefined) {
    m.transparent = true;
    m.opacity = tint.opacity;
  }
  if (tint.depthWrite !== undefined) m.depthWrite = tint.depthWrite;
}

/**
 * Clones a model into the scene at `length` world units, centred on its root, with its own
 * mixer at a random phase so nothing swims in sync.
 */
export function spawner(
  { THREE, keep, scene }: Kit,
  clone: typeof SkeletonUtils.clone,
): Spawner {
  return (gltf, length, { speed = 1, rot, ground, tint } = {}, index = 0) => {
    const model = clone(gltf.scene);
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.frustumCulled = false;
      if (tint && node.material instanceof THREE.MeshStandardMaterial) {
        node.material = keep(node.material.clone());
        applyTint(node.material, tint, index);
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations[0];
    const action = clip ? mixer.clipAction(clip) : null;
    if (action && clip) {
      action.play();
      action.time = Math.random() * clip.duration;
      action.timeScale = speed;
    }
    mixer.update(0);
    const box = posedBox(THREE, model);
    const size = box.getSize(new THREE.Vector3());
    const k = length / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(k);
    model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);
    const pivot = new THREE.Group();
    if (rot) pivot.rotation.set(...rot);
    pivot.add(model);
    const root = new THREE.Group();
    root.add(pivot);
    scene.add(root);
    if (ground) pivot.position.y -= posedBox(THREE, root).min.y;
    return { root, mixer, action };
  };
}
