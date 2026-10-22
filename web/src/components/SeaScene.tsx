import type { RefObject } from "react";

interface SeaSceneProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

// `data-zone` and `data-gl` are set by useSea; the gradient is the no-WebGL sea.
export function SeaScene({ canvasRef }: SeaSceneProps) {
  return (
    <div
      aria-hidden="true"
      data-zone="surface"
      className="group fixed inset-0 -z-10 bg-linear-to-b transition-colors duration-700 data-[zone=abyss]:from-water-3 data-[zone=abyss]:to-water-4 data-[zone=midnight]:from-water-2 data-[zone=midnight]:to-water-3 data-[zone=sunlight]:from-water-0 data-[zone=sunlight]:to-water-1 data-[zone=surface]:from-sky data-[zone=surface]:via-haze data-[zone=surface]:to-water-0 data-[zone=trench]:from-water-4 data-[zone=trench]:to-water-5 data-[zone=twilight]:from-water-1 data-[zone=twilight]:to-water-2"
    >
      <canvas
        ref={canvasRef}
        className="block size-full opacity-0 transition-opacity duration-700 group-data-[gl=on]:opacity-100"
      />
      <div data-foam className="foam" />
      <div
        data-vignette
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_48%,color-mix(in_oklab,var(--color-black)_70%,transparent)_100%)] opacity-0"
      />
    </div>
  );
}
