import { type RefObject, useEffect, useRef } from "react";
import { MODEL_URL } from "#/constants/models.constants";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  BUDDY,
  BUDDY_GROUND,
  BUDDY_KEY,
  BUDDY_SKY,
} from "#/constants/sea.constants";
import { LEGACY_LIGHT } from "#/constants/seaScene.constants";
import { oscillate } from "#/utils/ease.utils";
import { posedBox } from "./sea/models";

/**
 * The server's companion (P5.36): the sea's fish in its own small renderer, swimming hard while
 * the server works and drifting once it is done. three.js and the model load lazily.
 */
export function useBuddy(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  busy: boolean,
) {
  const working = useRef(busy);
  working.current = busy;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let stop = () => {};
    Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/utils/SkeletonUtils.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]).then(([THREE, { GLTFLoader }, { clone }, { MeshoptDecoder }]) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, BUDDY.maxPixelRatio));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        BUDDY.fov,
        canvas.clientWidth / canvas.clientHeight,
        BUDDY.near,
        BUDDY.far,
      );
      camera.position.fromArray(BUDDY.eye);
      scene.add(
        new THREE.HemisphereLight(
          BUDDY_SKY,
          BUDDY_GROUND,
          BUDDY.sky * LEGACY_LIGHT,
        ),
      );
      const key = new THREE.DirectionalLight(
        BUDDY_KEY,
        BUDDY.key * LEGACY_LIGHT,
      );
      key.position.fromArray(BUDDY.keyAt);
      scene.add(key);
      const reduced = matchMedia(REDUCED_MOTION_QUERY);
      const fish = new THREE.Group();
      scene.add(fish);
      let mixer: InstanceType<typeof THREE.AnimationMixer> | null = null;
      let action: ReturnType<
        InstanceType<typeof THREE.AnimationMixer>["clipAction"]
      > | null = null;

      new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .load(MODEL_URL.fish, (gltf) => {
          if (disposed) return;
          const model = clone(gltf.scene);
          model.traverse((node) => {
            node.frustumCulled = false;
          });
          mixer = new THREE.AnimationMixer(model);
          if (gltf.animations[0]) {
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }
          mixer.update(0);
          // The posed size: a skinned fish's rest bounds are not what is drawn.
          const box = posedBox(THREE, model);
          const size = box.getSize(new THREE.Vector3());
          const view = camera.getViewSize(
            camera.position.z,
            new THREE.Vector2(),
          );
          const k = BUDDY.fill * Math.min(view.x / size.x, view.y / size.y);
          model.scale.setScalar(k);
          model.position
            .copy(box.getCenter(new THREE.Vector3()))
            .multiplyScalar(-k);
          fish.add(model);
        });

      let pace = BUDDY.restPace;
      let t = 0;
      let last = 0;
      let frame = 0;
      const tick = (now: number) => {
        const dt = last ? Math.min((now - last) / 1000, BUDDY.maxFrameS) : 0;
        last = now;
        // Ease between a hard swim and an idle drift, so the change of pace never snaps
        const to = working.current ? BUDDY.busyPace : BUDDY.restPace;
        pace += (to - pace) * Math.min(1, dt * BUDDY.paceRate);
        if (!reduced.matches) {
          t += dt;
          if (action) action.timeScale = pace;
          mixer?.update(dt);
        }
        // The model is long along X: a small turn off the side view gives it some depth
        fish.rotation.y = oscillate(BUDDY.turn, BUDDY.sway, BUDDY.swayRate, t);
        fish.position.y = Math.sin(t * (1 + pace)) * BUDDY.bob;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      stop = () => {
        cancelAnimationFrame(frame);
        mixer?.stopAllAction();
        renderer.dispose();
      };
    });
    return () => {
      disposed = true;
      stop();
    };
  }, [canvasRef]);
}
