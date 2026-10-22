import { type RefObject, useEffect, useRef } from "react";
import type * as Three from "three";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  HELM_BRASS,
  HELM_BRASS_GLOW,
  HELM_GROUND,
  HELM_KEY,
  HELM_RIM,
  HELM_SKY,
  HELM_SPOKE,
  HELM_WOOD,
} from "#/constants/predive.constants";

// Light intensities are tuned for three's old non-physical lights, like the sea's (see useSea).
const LEGACY_LIGHT = Math.PI;

function buildWheel(
  THREE: typeof Three,
  keep: (item: { dispose: () => void }) => void,
) {
  const wood = new THREE.MeshStandardMaterial({
    color: HELM_WOOD,
    roughness: 0.45,
    metalness: 0.05,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: HELM_BRASS,
    roughness: 0.28,
    metalness: 0.6,
    emissive: HELM_BRASS_GLOW,
  });
  const rim = new THREE.TorusGeometry(0.8, 0.075, 18, 120);
  const band = new THREE.TorusGeometry(0.8, 0.018, 8, 120);
  const hub = new THREE.CylinderGeometry(0.2, 0.22, 0.2, 40);
  const cap = new THREE.SphereGeometry(
    0.12,
    24,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const spoke = new THREE.LatheGeometry(
    HELM_SPOKE.map(([r, y]) => new THREE.Vector2(r, y)),
    20,
  );
  for (const item of [wood, brass, rim, band, hub, cap, spoke]) keep(item);

  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(rim, wood));
  for (const z of [-0.07, 0.07]) {
    const ring = new THREE.Mesh(band, brass);
    ring.position.z = z;
    wheel.add(ring);
  }
  const hubMesh = new THREE.Mesh(hub, brass);
  hubMesh.rotation.x = Math.PI / 2;
  wheel.add(hubMesh);
  const capMesh = new THREE.Mesh(cap, brass);
  capMesh.rotation.x = Math.PI / 2;
  capMesh.position.z = 0.1;
  wheel.add(capMesh);
  for (let i = 0; i < 8; i++) {
    const arm = new THREE.Mesh(spoke, wood);
    arm.rotation.z = (i * Math.PI) / 4;
    wheel.add(arm);
  }
  return wheel;
}

/**
 * A ship's wheel in its own small renderer (P5.32). It turns toward `angle` on a heavy spring with a
 * little overshoot, and sways slightly; reduced motion snaps it. Without WebGL the canvas stays blank.
 */
export function useHelm(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  angle: number,
) {
  const goal = useRef(angle);
  goal.current = angle;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let stop = () => {};
    // three.js loads lazily, as for the sea, so it never weighs on the first paint
    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: Three.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      const disposables: { dispose: () => void }[] = [];
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0, 4.5);
      scene.add(
        new THREE.HemisphereLight(HELM_SKY, HELM_GROUND, 0.55 * LEGACY_LIGHT),
      );
      const key = new THREE.DirectionalLight(HELM_KEY, 2 * LEGACY_LIGHT);
      key.position.set(-2, 3, 4);
      scene.add(key);
      // No falloff: the old lights' linear falloff at the wheel's distance comes to about 0.69
      const rim = new THREE.PointLight(
        HELM_RIM,
        2.2 * 0.69 * LEGACY_LIGHT,
        8,
        0,
      );
      rim.position.set(1.6, -1.2, -1.5);
      scene.add(rim);
      const wheel = buildWheel(THREE, (item) => disposables.push(item));
      const tilt = new THREE.Group();
      tilt.rotation.set(-0.32, 0.42, 0);
      tilt.add(wheel);
      scene.add(tilt);

      const reduced = matchMedia(REDUCED_MOTION_QUERY);
      let turn = goal.current;
      let speed = 0;
      let sway = 0;
      let last = 0;
      let frame = 0;
      const tick = (now: number) => {
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        if (reduced.matches) {
          turn = goal.current;
          speed = 0;
        } else {
          speed += ((goal.current - turn) * 38 - speed * 9) * dt;
          turn += speed * dt;
          sway += dt;
        }
        wheel.rotation.z = -turn;
        tilt.rotation.y = 0.42 + Math.sin(sway * 0.6) * 0.06;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      stop = () => {
        cancelAnimationFrame(frame);
        for (const item of disposables) item.dispose();
        renderer.dispose();
      };
    });
    return () => {
      disposed = true;
      stop();
    };
  }, [canvasRef]);
}
