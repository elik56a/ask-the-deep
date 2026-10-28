import type { RefObject } from "react";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useDiveDepth } from "#/hooks/useDiveDepth";
import type { Lang } from "#/types/i18n.types";
import { depthReadout } from "#/utils/depth.utils";

interface DepthTagProps {
  lang: Lang;
  waterRef: RefObject<HTMLElement | null>;
}

/** Rides the depth rail at the diver line: depth, temperature and pressure, or the air above. */
export function DepthTag({ lang, waterRef }: DepthTagProps) {
  const { meters, eye } = useDiveDepth(waterRef);
  const read = depthReadout(meters, eye, DIVE_COPY[lang].air);
  return (
    <div
      aria-hidden="true"
      // Starts at the screen edge and reaches at least the rail, so a long depth grows inward, never off-screen
      className="pointer-events-none fixed top-[26vh] start-0 z-12 flex min-w-[calc(max(16px,env(safe-area-inset-left,0px))+56px)] -translate-y-1/2 flex-col items-end gap-1 rounded-e-[10px] bg-surface/72 py-2 ps-2 pe-3 text-end backdrop-blur-sm pointer-coarse:bg-surface/90 pointer-coarse:backdrop-blur-none after:absolute after:-end-px after:top-1/2 after:-translate-y-1/2 after:border-y-6 after:border-y-transparent after:border-s-7 after:border-s-glow after:drop-shadow-[0_0_4px_var(--color-glow)] after:content-[''] lg:min-w-22"
    >
      <b
        dir="ltr"
        className="whitespace-nowrap font-mono font-semibold text-base text-text tabular-nums leading-none tracking-[-0.02em] max-lg:text-[13px]"
      >
        {read.depth} m
      </b>
      <small
        dir="ltr"
        className="whitespace-nowrap font-medium font-mono text-[10px] text-muted tabular-nums leading-none max-lg:hidden"
      >
        {read.temp}
      </small>
      <small
        dir="ltr"
        className="whitespace-nowrap font-medium font-mono text-[10px] text-muted tabular-nums leading-none max-lg:hidden"
      >
        {read.pressure}
      </small>
    </div>
  );
}
