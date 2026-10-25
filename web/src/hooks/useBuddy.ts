import { type RefObject, useEffect, useRef } from "react";
import { createBuddy } from "./sea/buddy";

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
    let cancelled = false;
    let dispose: (() => void) | null = null;
    Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/utils/SkeletonUtils.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]).then(([THREE, gltf, skeleton, { MeshoptDecoder }]) => {
      if (cancelled) return;
      const loader = new gltf.GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const addons = { THREE, loader, clone: skeleton.clone };
      dispose = createBuddy(addons, canvas, () => working.current);
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [canvasRef]);
}
