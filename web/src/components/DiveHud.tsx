import { ArrowDown } from "lucide-react";
import type { RefObject } from "react";
import { DepthTag } from "#/components/DepthTag";
import { PlaybackBar } from "#/components/PlaybackBar";
import { ServerPanel } from "#/components/ServerPanel";
import { Button } from "#/components/ui/button";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useDiveDepth } from "#/hooks/useDiveDepth";
import type { Lang } from "#/types/i18n.types";
import type { DiveMode } from "#/types/sea.types";
import type { ShownDive } from "#/types/shownDive.types";
import { messageText } from "#/utils/chat.utils";

interface DiveHudProps {
  lang: Lang;
  mode: DiveMode;
  view: ShownDive;
  waterRef: RefObject<HTMLElement | null>;
  /** The chat covers the scene at the seabed, so the server panel steps aside. */
  covered: boolean;
  following: boolean;
  onFollow: () => void;
  onSkip: () => void;
}

/** What floats over the dive: the server panel, the depth tag, the pace controls and "follow". */
export function DiveHud({
  lang,
  mode,
  view,
  waterRef,
  covered,
  following,
  onFollow,
  onSkip,
}: DiveHudProps) {
  const { player, shown, trace } = view;
  const dive = DIVE_COPY[lang];
  const atSurface = useDiveDepth(waterRef).meters === 0;
  return (
    <>
      <ServerPanel
        lang={lang}
        totals={trace.totals}
        status={
          trace.outcome ?? (player.events.length > 0 ? "running" : "idle")
        }
        clockMs={player.events.at(-1)?.t_ms ?? 0}
        covered={covered}
      />
      <DepthTag lang={lang} waterRef={waterRef} />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-18 flex flex-col items-center gap-3">
        {mode === "dive" && !following && (
          <div
            className={
              atSurface
                ? "glass console-surface pointer-events-auto flex flex-col items-center gap-3.5 rounded-[18px] px-6 py-5"
                : "contents"
            }
          >
            {atSurface && (
              <p className="font-medium text-lg">{dive.stillBelow}</p>
            )}
            <Button
              variant="outline"
              onClick={onFollow}
              className={`glass follow-glow pointer-events-auto rounded-full ${atSurface ? "min-h-12 px-6 text-base" : "min-h-11 px-4"}`}
            >
              {dive.follow}
              <ArrowDown aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
        {mode === "dive" && player.playing && (
          <PlaybackBar
            lang={lang}
            dive={shown?.dive ?? 0}
            question={shown ? messageText(shown.question) : ""}
            paused={player.paused}
            speed={player.speed}
            progress={player.progress}
            serverMs={player.serverMs}
            serverDone={player.serverDone}
            onPause={player.setPaused}
            onSpeed={player.setSpeed}
            onSkip={onSkip}
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {mode === "reveal" &&
          (trace.outcome === "answered" ? dive.back.answered : dive.back.empty)}
      </p>
    </>
  );
}
