import type * as Three from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_URL } from "#/constants/models.constants";
import { POSE_SAMPLES } from "#/constants/seaScene.constants";
import type { ModelId } from "#/types/models.types";
import type { Loaded, ThreeModule } from "#/types/seaScene.types";

/** Bounds of the animated pose; a skinned mesh's rest bounds can be far off. */
export function posedBox(THREE: ThreeModule, root: Three.Object3D): Three.Box3 {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const position = node.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(position.count / POSE_SAMPLES));
    for (let i = 0; i < position.count; i += stride) {
      point.fromBufferAttribute(position, i);
      if (node instanceof THREE.SkinnedMesh) node.applyBoneTransform(i, point);
      box.expandByPoint(point.applyMatrix4(node.matrixWorld));
    }
  });
  return box;
}

export function disposeModel(THREE: ThreeModule, gltf: GLTF): void {
  gltf.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

/** Loads models in parallel; one that fails is left out rather than failing the rest. */
export async function loadModels(
  loader: GLTFLoader,
  ids: ModelId[],
): Promise<Loaded> {
  const results = await Promise.all(
    ids.map((id) =>
      loader.loadAsync(MODEL_URL[id]).then(
        (gltf): [ModelId, GLTF] => [id, gltf],
        () => null,
      ),
    ),
  );
  return Object.fromEntries(results.filter((item) => item !== null));
}
