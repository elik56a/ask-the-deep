import type { CSSProperties } from "react";
import { HOOD_COPY } from "#/constants/hood.constants";
import type { RetrievalCompleted } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import { clamp01 } from "#/utils/ease.utils";
import { passedCount } from "#/utils/stepDetail.utils";
import { fill } from "#/utils/toolSteps.utils";

interface RetrievalGateProps {
  event: RetrievalCompleted;
  lang: Lang;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function RetrievalGate({
  event,
  lang,
  focusChunk,
  onFocusChunk,
}: RetrievalGateProps) {
  const copy = HOOD_COPY[lang].card;
  const gate = event.threshold.toFixed(2);
  const passed = passedCount(event.passages);
  return (
    <>
      <ol className="flex flex-col gap-1">
        {event.passages.map((passage, i) => (
          <li
            key={passage.chunk_id}
            onPointerEnter={() => onFocusChunk(passage.chunk_id)}
            onPointerLeave={() => onFocusChunk(null)}
            className={`-mx-2 grid grid-cols-[minmax(0,1fr)_minmax(80px,36%)_40px] items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 ${focusChunk === passage.chunk_id ? "bg-accent/15" : ""}`}
          >
            <div className="min-w-0 text-[13px] leading-[1.3]">
              <p
                dir="auto"
                className={passage.above_threshold ? "" : "text-muted"}
              >
                {passage.breadcrumb}
              </p>
              <p
                dir="ltr"
                className="truncate font-mono text-[11px] text-muted"
              >
                {passage.chunk_id}
              </p>
            </div>
            <div
              role="img"
              aria-label={fill(copy.score, {
                s: passage.score.toFixed(2),
                t: gate,
              })}
              className="relative h-2 rounded bg-case/55"
            >
              <div
                className={`bar-fill absolute inset-y-0 start-0 rounded ${passage.above_threshold ? "bg-accent shadow-[0_0_10px_color-mix(in_oklab,var(--color-glow)_60%,transparent)]" : "bg-warn opacity-70"}`}
                style={
                  {
                    width: `${clamp01(passage.score) * 100}%`,
                    "--i": i,
                  } as CSSProperties
                }
              />
              <div
                className="absolute -inset-y-1.25 border-text border-s-2 border-dashed"
                style={{ insetInlineStart: `${event.threshold * 100}%` }}
              />
            </div>
            <p
              className={`text-end font-medium font-mono text-xs tabular-nums leading-none ${passage.above_threshold ? "" : "text-warn"}`}
            >
              {passage.score.toFixed(2)}
            </p>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-accent" />
          {fill(copy.reachModel, { n: String(passed) })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-warn" />
          {fill(copy.blockedBelow, {
            n: String(event.passages.length - passed),
          })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 border-text border-s-2 border-dashed" />
          {fill(copy.gate, { t: gate })}
        </span>
      </p>
    </>
  );
}
