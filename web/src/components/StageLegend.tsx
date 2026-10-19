import { HOOD_COPY } from "#/constants/hood.constants";
import { STAGE_ORDER } from "#/constants/movement.constants";
import type { Lang } from "#/types/i18n.types";
import type { TraceSpan } from "#/types/trace.types";

interface StageLegendProps {
  spans: TraceSpan[];
  lang: Lang;
}

export function StageLegend({ spans, lang }: StageLegendProps) {
  const copy = HOOD_COPY[lang];
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {STAGE_ORDER.map((stage) => {
          const mine = spans.filter((span) => span.stage === stage);
          const running = mine.some((span) => span.end === null);
          const done = !running && mine.length > 0;
          return (
            <li
              key={stage}
              className={`inline-flex items-center gap-2 rounded-full border bg-case/70 px-2.5 py-1.5 font-mono text-[11px] uppercase leading-none tracking-[0.08em] backdrop-blur-sm transition-colors duration-200 ${running ? "border-accent/60 text-text" : "border-line-strong text-muted"}`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full transition-[background-color,box-shadow] duration-200 ${running ? "bg-accent shadow-[0_0_10px_var(--color-accent)]" : done ? "bg-ok" : "bg-line-strong"}`}
              />
              {copy.stages[stage]}
            </li>
          );
        })}
      </ul>
      <p className="text-pretty text-muted text-xs">{copy.movementNote}</p>
    </div>
  );
}
