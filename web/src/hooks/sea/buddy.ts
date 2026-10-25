import type * as Three from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_URL } from "#/constants/models.constants";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  BUDDY,
  BUDDY_GROUND,
  BUDDY_KEY,
  BUDDY_SKY,
} from "#/constants/sea.constants";
import { LEGACY_LIGHT } from "#/constants/seaScene.constants";
import type { Addons, ThreeModule } from "#/types/seaScene.types";
import { buddyPace, buddyPose, buddyScale } from "#/utils/buddy.utils";
import { frameSeconds } from "#/utils/ease.utils";
import { posedBox } from "./models";

interface Swim {
  mixer: Three.AnimationMixer;
  action: Three.AnimationAction | null;
}

function renderer(THREE: ThreeModule, canvas: HTMLCanvasElement) {
  try {
    const gl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    gl.setPixelRatio(Math.min(devicePixelRatio, BUDDY.maxPixelRatio));
    gl.setSize(canvas.clientWidth, canvas.clientHeight, false);
    return gl;
  } catch {
    return null;
  }
}

function stage(THREE: ThreeModule, aspect: number) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    BUDDY.fov,
    aspect,
    BUDDY.near,
    BUDDY.far,
  );
  camera.position.fromArray(BUDDY.eye);
  const sky = BUDDY.sky * LEGACY_LIGHT;
  scene.add(new THREE.HemisphereLight(BUDDY_SKY, BUDDY_GROUND, sky));
  const key = new THREE.DirectionalLight(BUDDY_KEY, BUDDY.key * LEGACY_LIGHT);
  key.position.fromArray(BUDDY.keyAt);
  scene.add(key);
  return { scene, camera };
}

/** The fish posed, centred and scaled to the view, swimming its first clip. */
function swimmer(
  { THREE, clone }: Addons,
  gltf: GLTF,
  camera: Three.PerspectiveCamera,
) {
  const model = clone(gltf.scene);
  model.traverse((node) => {
    node.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  const action = clip ? mixer.clipAction(clip) : null;
  action?.play();
  mixer.update(0);
  // The posed size: a skinned fish's rest bounds are not what is drawn.
  const box = posedBox(THREE, model);
  const view = camera.getViewSize(camera.position.z, new THREE.Vector2());
  const k = buddyScale(view, box.getSize(new THREE.Vector3()));
  model.scale.setScalar(k);
  model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);
  return { model, swim: { mixer, action } };
}

/**
 * The server panel's fish in its own small renderer, swimming hard while `busy()` and drifting
 * otherwise. Returns its dispose, or null without WebGL.
 */
export function createBuddy(
  addons: Addons,
  canvas: HTMLCanvasElement,
  busy: () => boolean,
): (() => void) | null {
  const gl = renderer(addons.THREE, canvas);
  if (!gl) return null;
  const { scene, camera } = stage(
    addons.THREE,
    canvas.clientWidth / canvas.clientHeight,
  );
  const reduced = matchMedia(REDUCED_MOTION_QUERY);
  const fish = new addons.THREE.Group();
  scene.add(fish);
  let swim: Swim | null = null;
  let disposed = false;
  addons.loader.load(MODEL_URL.fish, (gltf) => {
    if (disposed) return;
    const loaded = swimmer(addons, gltf, camera);
    fish.add(loaded.model);
    swim = loaded.swim;
  });

  let pace: number = BUDDY.restPace;
  let t = 0;
  let last = 0;
  let frame = 0;
  const tick = (now: number) => {
    const dt = frameSeconds(now, last);
    last = now;
    pace = buddyPace(pace, busy(), dt);
    if (!reduced.matches) {
      t += dt;
      if (swim?.action) swim.action.timeScale = pace;
      swim?.mixer.update(dt);
    }
    const pose = buddyPose(t, pace);
    fish.rotation.y = pose.turn;
    fish.position.y = pose.bob;
    gl.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    swim?.mixer.stopAllAction();
    gl.dispose();
  };
}
