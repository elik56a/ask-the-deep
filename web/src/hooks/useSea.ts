import { type RefObject, useEffect, useRef } from "react";
import type { SeaControls } from "#/types/sea.types";
import type { Sea } from "#/types/seaScene.types";
import { createSea } from "./sea/createSea";
import { trackZone } from "./sea/zone";

/**
 * Runs the sea behind the page (P5.20, P5.37): sky and swell at the surface, the water
 * darkening with scroll depth below `waterRef`, creatures and the diver. three.js and the
 * models load lazily on the client. Without WebGL, `data-gl="off"` and `data-zone` on the
 * host drive a CSS gradient instead.
 */
export function useSea(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  waterRef: RefObject<HTMLElement | null>,
): RefObject<SeaControls | null> {
  const controls = useRef<SeaControls | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    let sea: Sea | null = null;
    let untrack: (() => void) | null = trackZone(host, waterRef);
    let cancelled = false;
    Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/utils/SkeletonUtils.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]).then(([THREE, gltf, skeleton, { MeshoptDecoder }]) => {
      if (cancelled) return;
      const loader = new gltf.GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      sea = createSea(
        { THREE, loader, clone: skeleton.clone },
        canvas,
        host,
        waterRef,
      );
      if (!sea) {
        host.dataset.gl = "off";
        return;
      }
      untrack?.();
      untrack = null;
      host.dataset.gl = "on";
      controls.current = sea.controls;
    });
    return () => {
      cancelled = true;
      untrack?.();
      sea?.dispose();
      controls.current = null;
    };
  }, [canvasRef, waterRef]);

  return controls;
}
