import { EventCard } from "#/components/EventCard";
import { Eyebrow } from "#/components/Eyebrow";
import { HoodMeters } from "#/components/HoodMeters";
import { Movement } from "#/components/Movement";
import { RunClock } from "#/components/RunClock";
import { StageLegend } from "#/components/StageLegend";
import { TraceWaterfall } from "#/components/TraceWaterfall";
import {
  EVENTS_WITHOUT_CARD,
  HOOD_COPY,
  STATUS_DOT,
} from "#/constants/hood.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { HoodStatus } from "#/types/hood.types";
import type { Lang } from "#/types/i18n.types";
import { fill } from "#/utils/toolSteps.utils";
import { buildTrace } from "#/utils/trace.utils";

interface HoodPanelProps {
  lang: Lang;
  events: StreamEvent[];
  running: boolean;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function HoodPanel({
  lang,
  events,
  running,
  focusChunk,
  onFocusChunk,
}: HoodPanelProps) {
  const copy = HOOD_COPY[lang];
  const trace = buildTrace(events);
  const status: HoodStatus = trace.outcome ?? (running ? "running" : "idle");
  const finalMs = trace.totals.latencyMs ?? trace.lastMs;
  const cards = events.filter(
    (item) => !EVENTS_WITHOUT_CARD.includes(item.event.type),
  );
  const section = "border-line border-t p-5";

  return (
    <section
      aria-label={copy.eyebrow}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-case after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-linear-115 after:from-text/5 after:via-25% after:via-transparent after:to-transparent"
    >
      <header className="relative isolate flex min-h-80 flex-col justify-between gap-6 p-5">
        <Movement spans={trace.spans} running={running} />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h2 className="text-balance font-semibold text-title leading-tight tracking-tight">
              {copy.title}
            </h2>
            <p
              role="status"
              className="flex items-center gap-2 font-mono text-muted text-xs"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${STATUS_DOT[status]}`}
              />
              {copy.status[status]}
            </p>
          </div>
          <RunClock running={running} finalMs={finalMs} label={copy.elapsed} />
        </div>
        <StageLegend spans={trace.spans} lang={lang} />
      </header>

      <div className={section}>
        <HoodMeters totals={trace.totals} lang={lang} />
      </div>

      <section aria-label={copy.trace} className={section}>
        <div className="mb-3 flex justify-between gap-3">
          <Eyebrow>{copy.trace}</Eyebrow>
          <Eyebrow>{copy.traceUnit}</Eyebrow>
        </div>
        <TraceWaterfall
          spans={trace.spans}
          running={running}
          finalMs={finalMs}
          lang={lang}
        />
      </section>

      <section aria-label={copy.events} className={section}>
        <div className="mb-3 flex justify-between gap-3">
          <Eyebrow>{copy.events}</Eyebrow>
          <Eyebrow>
            {fill(copy.eventCount, { n: String(cards.length) })}
          </Eyebrow>
        </div>
        <ol className="flex flex-col">
          {cards.map((item) => (
            <li
              key={item.seq}
              className="border-line border-t border-dashed py-3 first:border-t-0 first:pt-0"
            >
              <EventCard
                item={item}
                lang={lang}
                retrieved={trace.retrieved}
                focusChunk={focusChunk}
                onFocusChunk={onFocusChunk}
              />
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
