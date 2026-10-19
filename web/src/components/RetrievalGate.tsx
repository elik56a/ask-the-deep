import { HOOD_COPY } from "#/constants/hood.constants";
import type { RetrievalCompleted } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
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
  const passed = event.passages.filter((p) => p.above_threshold).length;
  return (
    <>
      <ol className="flex flex-col gap-1">
        {event.passages.map((passage) => (
          <li
            key={passage.chunk_id}
            onPointerEnter={() => onFocusChunk(passage.chunk_id)}
            onPointerLeave={() => onFocusChunk(null)}
            className={`-mx-2 grid grid-cols-[minmax(0,1fr)_minmax(80px,38%)_40px] items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 ${focusChunk === passage.chunk_id ? "bg-accent/15" : ""}`}
          >
            <div className="min-w-0 text-[13px] leading-snug">
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
              className="relative h-2 rounded bg-sunk"
            >
              <div
                className={`absolute inset-y-0 start-0 rounded ${passage.above_threshold ? "bg-accent" : "bg-warn/80"}`}
                style={{
                  width: `${Math.min(Math.max(passage.score, 0), 1) * 100}%`,
                }}
              />
              <div
                className="absolute -inset-y-1.5 border-text border-s-2"
                style={{ insetInlineStart: `${event.threshold * 100}%` }}
              />
            </div>
            <p
              className={`text-end font-mono text-xs tabular-nums ${passage.above_threshold ? "" : "text-warn"}`}
            >
              {passage.score.toFixed(2)}
            </p>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent" />
          {fill(copy.reachModel, { n: String(passed) })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-warn" />
          {fill(copy.blockedBelow, {
            n: String(event.passages.length - passed),
          })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 bg-text" />
          {fill(copy.gate, { t: gate })}
        </span>
      </p>
    </>
  );
}
