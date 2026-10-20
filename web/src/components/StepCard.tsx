import { StepDetail } from "#/components/StepDetail";
import { DIVE_COPY, STEP_TONE } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep } from "#/types/sea.types";
import { formatInt, formatMs } from "#/utils/format.utils";
import { stepText } from "#/utils/stepText.utils";
import { fill } from "#/utils/toolSteps.utils";

interface StepCardProps {
  lang: Lang;
  step: DiveStep;
  index: number;
  meters: number;
  ended: boolean;
  retrieved: string[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function StepCard({
  lang,
  step,
  index,
  meters,
  ended,
  retrieved,
  focusChunk,
  onFocusChunk,
}: StepCardProps) {
  const copy = DIVE_COPY[lang].steps;
  const { label, title } = stepText(step, copy, ended);
  const latest = step.result ?? step.event;
  const types = [step.event, step.result]
    .flatMap((item) => (item ? [item.event.type] : []))
    .join(" → ");
  const detail = { lang, retrieved, focusChunk, onFocusChunk };
  return (
    <article
      className={`relative flex min-w-0 flex-col gap-2 rounded-[14px] border border-[color-mix(in_oklab,var(--c)_30%,transparent)] bg-case/46 px-3.5 py-3 backdrop-blur-sm ${STEP_TONE[step.kind]}`}
    >
      <span
        aria-hidden="true"
        className="absolute -start-8.25 top-3.75 size-2.25 rounded-full bg-(--c) shadow-[0_0_12px_var(--c)] after:absolute after:start-2.25 after:top-1 after:h-px after:w-6 after:bg-[color-mix(in_oklab,var(--c)_50%,transparent)]"
      />
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="rounded-md bg-(--c) px-1.75 py-1.25 font-mono font-semibold text-[11px] text-on-accent uppercase leading-none tracking-[0.08em]">
          {fill(copy.step, { n: String(index + 1) })}
        </span>
        <span className="font-mono font-semibold text-(--c) text-[11px] uppercase leading-none tracking-widest">
          {label}
        </span>
        <span
          dir="ltr"
          className="ms-auto font-mono text-muted text-xs tabular-nums leading-none"
        >
          {formatInt(Math.round(meters))} m
        </span>
      </header>
      <h3 className="font-semibold text-[1.0625rem] leading-snug">{title}</h3>
      {!(step.event.event.type === "llm.started" && (step.result || ended)) && (
        <StepDetail item={step.event} {...detail} />
      )}
      {step.result && <StepDetail item={step.result} {...detail} />}
      <p
        dir="ltr"
        className="text-start font-mono text-[11px] text-muted leading-snug [overflow-wrap:anywhere]"
      >
        {`${types} · #${step.event.seq} · +${formatMs(latest.t_ms)}`}
      </p>
    </article>
  );
}
