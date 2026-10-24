import type * as Three from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_URL } from "#/constants/models.constants";
import { POSE_SAMPLES } from "#/constants/seaScene.constants";
import type { ModelId } from "#/types/models.types";
import type { Loaded, ThreeModule } from "#/types/seaScene.types";

function meshesOf(THREE: ThreeModule, root: Three.Object3D): Three.Mesh[] {
  const meshes: Three.Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) meshes.push(node);
  });
  return meshes;
}

/** Up to `POSE_SAMPLES` vertex numbers spread over `count`. */
function samples(count: number): number[] {
  const stride = Math.max(1, Math.floor(count / POSE_SAMPLES));
  return Array.from(
    { length: Math.ceil(count / stride) },
    (_, k) => k * stride,
  );
}

/** Bounds of the animated pose; a skinned mesh's rest bounds can be far off. */
export function posedBox(THREE: ThreeModule, root: Three.Object3D): Three.Box3 {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const points = meshesOf(THREE, root).flatMap((mesh) =>
    samples(mesh.geometry.attributes.position.count).map(
      (i) => [mesh, i] as const,
    ),
  );
  for (const [mesh, i] of points) {
    point.fromBufferAttribute(mesh.geometry.attributes.position, i);
    if (mesh instanceof THREE.SkinnedMesh) mesh.applyBoneTransform(i, point);
    box.expandByPoint(point.applyMatrix4(mesh.matrixWorld));
  }
  return box;
}

export function disposeModel(THREE: ThreeModule, gltf: GLTF): void {
  const meshes = meshesOf(THREE, gltf.scene);
  const materials = meshes.flatMap((mesh) => [mesh.material].flat());
  const textures = materials
    .flatMap((material) => Object.values(material))
    .filter((value) => value instanceof THREE.Texture);
  for (const item of [
    ...meshes.map((m) => m.geometry),
    ...textures,
    ...materials,
  ])
    item.dispose();
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
