import { HOOD_COPY, SPAN_BAR } from "#/constants/hood.constants";
import { useLiveClock } from "#/hooks/useLiveClock";
import type { Lang } from "#/types/i18n.types";
import type { TraceSpan } from "#/types/trace.types";
import { formatMs } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";
import { rulerTicks } from "#/utils/trace.utils";

interface TraceWaterfallProps {
  spans: TraceSpan[];
  running: boolean;
  finalMs: number;
  lang: Lang;
}

export function TraceWaterfall({
  spans,
  running,
  finalMs,
  lang,
}: TraceWaterfallProps) {
  const copy = HOOD_COPY[lang];
  const now = useLiveClock(running);
  if (spans.length === 0) {
    return <p className="text-muted text-sm">{copy.waiting}</p>;
  }
  // Live, the scale keeps headroom past "now"; settled, it fits the whole run.
  const domain = running ? Math.max(1000, now * 1.15) : Math.max(finalMs, 1);
  const percent = (ms: number) => `${(ms / domain) * 100}%`;
  const label = (span: TraceSpan) =>
    span.stage === "llm"
      ? fill(copy.span.llm, { n: String(span.call ?? "") })
      : span.stage === "tool"
        ? (span.tool ?? "")
        : copy.span[span.stage];

  return (
    <div className="grid grid-cols-[minmax(84px,140px)_minmax(0,1fr)_64px] items-center gap-x-3 gap-y-2">
      <div />
      <div
        aria-hidden="true"
        className="relative h-5 border-line-strong border-b"
      >
        {rulerTicks(domain).map((at) => (
          <span
            key={at}
            className="absolute bottom-0 h-1.5 border-line-strong border-s"
            style={{ insetInlineStart: percent(at) }}
          >
            <span className="absolute start-0 bottom-2 whitespace-nowrap font-mono text-[10px] text-muted leading-none">
              {at === 0 ? "0" : formatMs(at)}
            </span>
          </span>
        ))}
      </div>
      <div />
      {spans.map((span) => {
        const end = span.end ?? now;
        return (
          <div key={`${span.stage}-${span.start}`} className="contents">
            <p
              className={`truncate text-[13px] ${span.stage === "tool" ? "font-mono" : ""}`}
            >
              {label(span)}
            </p>
            <div className="relative h-5 rounded bg-sunk/60">
              <div
                className={`absolute inset-y-1 min-w-0.5 rounded ${SPAN_BAR[span.stage]} ${span.end === null ? "animate-pulse motion-reduce:animate-none" : ""}`}
                style={{
                  insetInlineStart: percent(span.start),
                  width: percent(Math.max(end - span.start, 0)),
                }}
              />
            </div>
            <p className="text-end font-mono text-muted text-xs tabular-nums">
              {formatMs(end - span.start)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
