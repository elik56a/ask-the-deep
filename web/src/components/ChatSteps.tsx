import { StepIcon } from "#/components/StepIcon";
import { CHAT_COPY, STEP_MIN_MS } from "#/constants/chat.constants";
import type { RequestFinished } from "#/generated/events.gen";
import { usePacedCount } from "#/hooks/usePacedCount";
import type { ChatStep } from "#/types/chatSteps.types";
import type { Lang } from "#/types/i18n.types";
import { fill } from "#/utils/toolSteps.utils";

interface ChatStepsProps {
  steps: ChatStep[];
  outcome: RequestFinished["outcome"] | null;
  totalMs: number;
  lang: Lang;
}

export function ChatSteps({ steps, outcome, totalMs, lang }: ChatStepsProps) {
  const copy = CHAT_COPY[lang].steps;
  const shown = usePacedCount(steps.length, outcome !== null, STEP_MIN_MS);
  const visible = steps.slice(0, shown);
  const collapsed =
    shown === steps.length &&
    (outcome === "answered" || outcome === "no_information");
  const summary = fill(copy.doneIn, { s: (totalMs / 1000).toFixed(1) });

  const list = (
    <ol className="flex flex-col gap-1.5">
      {visible.map((step) => (
        <li
          key={step.id}
          className="flex items-center gap-2.5 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0"
        >
          <span className="grid size-4 flex-none place-items-center">
            <StepIcon state={step.state} />
          </span>
          <span dir="auto">{step.label}</span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="text-muted text-sm">
      <p className="sr-only" aria-live="polite">
        {collapsed ? summary : visible.at(-1)?.label}
      </p>
      {collapsed ? (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            <span className="grid size-4 flex-none place-items-center">
              <StepIcon state={outcome === "answered" ? "done" : "empty"} />
            </span>
            <span>{summary}</span>
            <span className="text-accent group-open:hidden">
              {copy.showSteps}
            </span>
            <span className="hidden text-accent group-open:inline">
              {copy.hideSteps}
            </span>
          </summary>
          <div className="mt-2">{list}</div>
        </details>
      ) : (
        list
      )}
    </div>
  );
}
