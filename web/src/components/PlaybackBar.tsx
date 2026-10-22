import { Button } from "#/components/ui/button";
import { SPEEDS } from "#/constants/pace.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import { formatMs } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";

interface PlaybackBarProps {
  lang: Lang;
  dive: number;
  question: string;
  paused: boolean;
  speed: number;
  progress: number;
  serverMs: number;
  serverDone: boolean;
  onPause: (paused: boolean) => void;
  onSpeed: (speed: number) => void;
  onSkip: () => void;
}

export function PlaybackBar({
  lang,
  dive,
  question,
  paused,
  speed,
  progress,
  serverMs,
  serverDone,
  onPause,
  onSpeed,
  onSkip,
}: PlaybackBarProps) {
  const copy = DIVE_COPY[lang].playback;
  const time = formatMs(serverMs);
  return (
    <section
      aria-label={copy.label}
      className="glass fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-18 mx-auto flex w-[min(760px,calc(100%-32px))] flex-col gap-2 overflow-hidden rounded-[18px] px-3.5 pt-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-haze px-1.75 py-1.25 font-mono font-semibold text-[11px] text-on-accent uppercase leading-none tracking-widest">
          {fill(copy.dive, { n: String(dive) })}
        </span>
        <span
          dir="auto"
          className="min-w-0 flex-[1_1_200px] truncate font-medium"
        >
          {question}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            aria-pressed={paused}
            onClick={() => onPause(!paused)}
            className="min-h-9 px-3"
          >
            {paused ? copy.resume : copy.pause}
          </Button>
          <fieldset className="flex rounded-lg border border-line-strong p-0.5">
            <legend className="sr-only">{copy.speed}</legend>
            {SPEEDS.map((value) => (
              <Button
                key={value}
                variant={value === speed ? "secondary" : "ghost"}
                aria-pressed={value === speed}
                onClick={() => onSpeed(value)}
                className="min-h-8 px-2.5 font-mono tabular-nums"
              >
                {value}×
              </Button>
            ))}
          </fieldset>
          <Button onClick={onSkip} className="min-h-9 px-3">
            {copy.skip}
          </Button>
        </div>
      </div>
      <p
        className={`flex items-center gap-2 font-mono text-xs leading-snug before:size-1.75 before:shrink-0 before:rounded-full ${serverDone ? "text-text before:bg-ok" : "text-muted before:animate-pulse before:bg-glow before:shadow-[0_0_8px_var(--color-glow)]"}`}
      >
        {fill(serverDone ? copy.serverDone : copy.serverRunning, { t: time })}
      </p>
      <div aria-hidden="true" className="-mx-3.5 h-0.75 bg-line">
        <div
          className="h-full bg-glow"
          style={{ inlineSize: `${progress * 100}%` }}
        />
      </div>
    </section>
  );
}
