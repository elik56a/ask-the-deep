import type { ReactNode, RefObject } from "react";
import { EventCard } from "#/components/EventCard";
import { DIVE_COPY } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep } from "#/types/sea.types";

interface DiveLogProps {
  lang: Lang;
  steps: DiveStep[];
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
          <div className="rounded-[14px] border border-accent/30 bg-case/46 px-3.5 py-3 backdrop-blur-sm">
            <EventCard
              item={step.result ?? step.event}
              lang={lang}
              retrieved={retrieved}
              focusChunk={focusChunk}
              onFocusChunk={onFocusChunk}
            />
          </div>
          {i === steps.length - 1 && end}
        </li>
      ))}
    </ol>
  );
}
