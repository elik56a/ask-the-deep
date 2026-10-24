import { StepDetail } from "#/components/StepDetail";
import { StreamText } from "#/components/StreamText";
import { SAY_AFTER_WORDS } from "#/constants/motion.constants";
import { DIVE_COPY, STEP_TONE } from "#/constants/sea.constants";
import { useFold } from "#/hooks/useFold";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep, StepContext } from "#/types/sea.types";
import { sayParts, stepSay } from "#/utils/stepSay.utils";
import { stepEvidence, stepText, techLine } from "#/utils/stepText.utils";
import { streamEnd } from "#/utils/streamWords.utils";
import { fill } from "#/utils/toolSteps.utils";

interface StepCardProps {
  lang: Lang;
  step: DiveStep;
  index: number;
  /** The newest step: large and narrated. The others fold into the log. */
  focus: boolean;
  ended: boolean;
  ctx: StepContext;
  model: string;
  written: { words: number; total: number };
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function StepCard({
  lang,
  step,
  index,
  focus,
  ended,
  ctx,
  model,
  written,
  focusChunk,
  onFocusChunk,
}: StepCardProps) {
  const dive = DIVE_COPY[lang];
  const { label, title } = stepText(step, dive.steps, ended, ctx);
  const say = stepSay(step, dive.say, ctx, ended);
  const { card, heading } = useFold(focus, title);
  const parts = say ? sayParts(say, streamEnd(title) + SAY_AFTER_WORDS) : [];
  return (
    <article
      ref={card}
      data-focus={focus || undefined}
      className={`step-enter group/card relative isolate flex min-w-0 flex-col gap-2 rounded-[14px] border border-[color-mix(in_oklab,var(--c)_30%,transparent)] bg-case/38 px-3.5 py-3 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-text)_14%,transparent)] backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-350 ease-out data-focus:gap-3 data-focus:rounded-[20px] data-focus:border-[color-mix(in_oklab,var(--c)_60%,transparent)] data-focus:bg-case/72 data-focus:px-5.5 data-focus:pt-5 data-focus:pb-5.5 data-focus:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-text)_18%,transparent),0_0_60px_-18px_color-mix(in_oklab,var(--c)_55%,transparent)] ${STEP_TONE[step.kind]}`}
    >
      <span
        aria-hidden="true"
        className="caustic absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
      />
      <span
        aria-hidden="true"
        className="absolute -start-8.25 top-4.25 size-2.25 rounded-full bg-(--c) shadow-[0_0_12px_var(--c)] after:absolute after:start-2.25 after:top-1 after:h-px after:w-6 after:bg-[color-mix(in_oklab,var(--c)_50%,transparent)] group-data-focus/card:-start-8.75 group-data-focus/card:size-3.25 group-data-focus/card:animate-[pulse-ring_1.6s_var(--ease-out)_infinite] group-data-focus/card:shadow-[0_0_0_5px_color-mix(in_oklab,var(--c)_22%,transparent),0_0_20px_var(--c)] motion-reduce:animate-none"
      />
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="rounded-md bg-(--c) px-1.75 py-1.25 font-mono font-semibold text-[11px] text-on-accent uppercase leading-none tracking-[0.08em]">
          {fill(dive.steps.step, { n: String(index + 1) })}
        </span>
        <span className="font-mono font-semibold text-(--c) text-[13px] uppercase leading-none tracking-[0.08em] group-data-focus/card:text-sm">
          {label}
        </span>
      </header>
      <h3
        ref={heading}
        key={title}
        className="text-pretty font-semibold text-[1.0625rem] leading-[1.35] group-data-focus/card:font-[650] group-data-focus/card:font-display group-data-focus/card:text-[clamp(1.5rem,2.6vw,2rem)] group-data-focus/card:leading-[1.15] group-data-focus/card:tracking-[-0.02em] group-data-focus/card:[font-stretch:112%]"
      >
        <StreamText text={title} />
      </h3>
      {say && (
        <p
          key={say.text}
          className="hidden max-w-[58ch] text-pretty text-[1.0625rem] text-text/86 leading-[1.55] group-data-focus/card:block"
        >
          {parts.map((part) =>
            part.quote ? (
              <q key={part.start} dir="auto" className="font-medium text-text">
                <StreamText text={part.text} start={part.start} />
              </q>
            ) : (
              <StreamText
                key={part.start}
                text={part.text}
                start={part.start}
              />
            ),
          )}
        </p>
      )}
      <div className="flex min-w-0 flex-col gap-2">
        {stepEvidence(step, ended).map((item) => (
          <StepDetail
            key={item.seq}
            item={item}
            lang={lang}
            model={model}
            written={written}
            carried={ctx.carried}
            retrieved={ctx.retrieved}
            focusChunk={focusChunk}
            onFocusChunk={onFocusChunk}
          />
        ))}
        <p
          dir="ltr"
          className="text-start font-mono text-[11px] text-muted leading-[1.4] [overflow-wrap:anywhere]"
        >
          {techLine(step.event)}
        </p>
      </div>
    </article>
  );
}
