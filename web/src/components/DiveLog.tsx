import type { ReactNode, RefObject } from "react";
import { StepCard } from "#/components/StepCard";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useRelayout } from "#/hooks/useRelayout";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep, StepContext } from "#/types/sea.types";

interface DiveLogProps {
  lang: Lang;
  steps: DiveStep[];
  ended: boolean;
  tops: number[];
  /** Every card has been measured, so `tops` are final. */
  measured: boolean;
  listRef: RefObject<HTMLOListElement | null>;
  ctx: StepContext;
  model: string;
  written: { words: number; total: number };
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
  /** Shown under the last step once the run has ended. */
  end: ReactNode;
}

/**
 * The dive log: each step at its depth, the newest one in focus; cards slide when the log re-lays out.
 */
export function DiveLog({
  lang,
  steps,
  ended,
  tops,
  measured,
  listRef,
  ctx,
  model,
  written,
  focusChunk,
  onFocusChunk,
  end,
}: DiveLogProps) {
  useRelayout(
    listRef,
    steps.map((step) => step.event.seq),
    tops,
    measured,
  );

  const last = steps.length - 1;
  return (
    <ol
      ref={listRef}
      aria-label={DIVE_COPY[lang].logLabel}
      className="absolute inset-0"
    >
      {steps.map((step, i) => (
        <li
          key={step.event.seq}
          className="absolute start-21 flex w-[min(600px,calc(100%-84px))] flex-col gap-3"
          style={{ top: tops[i] ?? 0 }}
        >
          <StepCard
            lang={lang}
            step={step}
            index={i}
            focus={i === last}
            ended={ended}
            ctx={ctx}
            model={model}
            written={written}
            focusChunk={focusChunk}
            onFocusChunk={onFocusChunk}
          />
          {i === last && end}
        </li>
      ))}
    </ol>
  );
}
