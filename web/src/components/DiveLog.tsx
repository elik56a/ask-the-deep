import type { ReactNode, RefObject } from "react";
import { StepCard } from "#/components/StepCard";
import { DIVE_COPY } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep } from "#/types/sea.types";
import { pxToMeters } from "#/utils/depth.utils";

interface DiveLogProps {
  lang: Lang;
  steps: DiveStep[];
  ended: boolean;
  tops: number[];
  listRef: RefObject<HTMLOListElement | null>;
  retrieved: string[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
  /** Shown under the last step once the run has ended. */
  end: ReactNode;
}

export function DiveLog({
  lang,
  steps,
  ended,
  tops,
  listRef,
  retrieved,
  focusChunk,
  onFocusChunk,
  end,
}: DiveLogProps) {
  return (
    <ol
      ref={listRef}
      aria-label={DIVE_COPY[lang].logLabel}
      className="absolute inset-0"
    >
      {steps.map((step, i) => (
        <li
          key={step.event.seq}
          className="absolute start-21 flex w-[min(560px,calc(100%-84px))] flex-col gap-3 transition-[top] duration-350 ease-out lg:w-[min(560px,calc(100%-84px-472px))]"
          style={{ top: tops[i] ?? 0 }}
        >
          <StepCard
            lang={lang}
            step={step}
            index={i}
            meters={pxToMeters(tops[i] ?? 0)}
            ended={ended}
            retrieved={retrieved}
            focusChunk={focusChunk}
            onFocusChunk={onFocusChunk}
          />
          {i === steps.length - 1 && end}
        </li>
      ))}
    </ol>
  );
}
