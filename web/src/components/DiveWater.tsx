import type { RefObject } from "react";
import { DepthRail } from "#/components/DepthRail";
import { DiveLog } from "#/components/DiveLog";
import { Seabed } from "#/components/Seabed";
import { DIVER_LINE } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import type { ShownDive } from "#/types/shownDive.types";

interface DiveWaterProps {
  lang: Lang;
  view: ShownDive;
  waterRef: RefObject<HTMLElement | null>;
  logRef: RefObject<HTMLOListElement | null>;
  focusChunk: string | null;
  onFocusChunk: (chunk: string | null) => void;
  onSurface: () => void;
  onReplay: () => void;
}

/** The water column: the depth rail and the dive log, with the seabed report once it has played. */
export function DiveWater({
  lang,
  view,
  waterRef,
  logRef,
  focusChunk,
  onFocusChunk,
  onSurface,
  onReplay,
}: DiveWaterProps) {
  const { steps, layout, ended, player } = view;
  return (
    <main
      ref={waterRef}
      className="relative min-h-svh overflow-clip"
      style={{
        height: `calc(${view.floor}px + ${(1 - DIVER_LINE) * 100}svh)`,
      }}
    >
      <div className="absolute inset-y-0 inset-x-[max(16px,env(safe-area-inset-left,0px))] lg:inset-x-8">
        <DepthRail lang={lang} />
        <DiveLog
          lang={lang}
          steps={steps}
          ended={ended}
          tops={layout.tops}
          measured={layout.measured}
          listRef={logRef}
          ctx={view.ctx}
          model={view.model}
          written={view.written}
          focusChunk={focusChunk}
          onFocusChunk={onFocusChunk}
          end={
            ended &&
            !player.playing && (
              <Seabed
                lang={lang}
                steps={steps}
                tops={layout.tops}
                trace={view.trace}
                onSurface={onSurface}
                onReplay={onReplay}
              />
            )
          }
        />
      </div>
    </main>
  );
}
