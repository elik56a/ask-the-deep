import { CheckIcon, ChevronDown } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  COUNT_FROM,
  COUNT_MS,
  PREDIVE_COPY,
  REPLAY_COUNT_FROM,
} from "#/constants/predive.constants";
import { usePreDiveClock } from "#/hooks/usePreDiveClock";
import type { Lang } from "#/types/i18n.types";
import type { PreDiveCheck as Check, PreDivePlan } from "#/types/predive.types";
import { cargoRows, slateTitle } from "#/utils/predive.utils";
import { fill } from "#/utils/toolSteps.utils";

interface PreDiveCheckProps {
  lang: Lang;
  plan: PreDivePlan;
  checks: Check[];
  /** The diver jumps now; the slate drops away, then `onGone`. */
  onDescend: () => void;
  onCancel: () => void;
  onGone: () => void;
}

export function PreDiveCheck({
  lang,
  plan,
  checks,
  onDescend,
  onCancel,
  onGone,
}: PreDiveCheckProps) {
  const copy = PREDIVE_COPY[lang];
  const n = checks.length;
  const count = plan.replay ? REPLAY_COUNT_FROM : COUNT_FROM;
  const { dialog, go, on, left, ticks, step, descend } = usePreDiveClock(
    n,
    count,
    onDescend,
    onGone,
  );
  const counting = step > 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="slate-title"
      data-on={on || undefined}
      data-left={left || undefined}
      data-ready={counting || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!left) onCancel();
      }}
      className="slate-veil fixed inset-0 z-40 m-0 size-full max-h-none max-w-none flex-col justify-end overflow-y-auto border-0 bg-transparent px-4 pt-[calc(24px+env(safe-area-inset-top,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] text-ink open:flex [@media(min-aspect-ratio:6/5)]:justify-center [@media(min-aspect-ratio:6/5)]:ps-[max(16px,6vw)]"
    >
      <div className="slate relative mx-auto flex w-[min(520px,100%)] flex-col gap-3 px-5 pt-7 pb-5 [@media(min-aspect-ratio:6/5)]:gap-4 [@media(min-aspect-ratio:6/5)]:px-6 [@media(min-aspect-ratio:6/5)]:pt-8 [@media(min-aspect-ratio:6/5)]:pb-6 [@media(min-aspect-ratio:6/5)]:mx-0 [@media(min-aspect-ratio:6/5)]:w-[min(440px,40vw)]">
        <span
          aria-hidden="true"
          className="absolute start-1/2 top-3 size-3 -translate-x-1/2 rounded-full bg-ink/14 shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--color-ink)_45%,transparent)] rtl:translate-x-1/2"
        />
        <div className="flex items-center justify-between gap-3 font-medium font-mono text-[11px] uppercase leading-none tracking-[0.12em]">
          <p className="text-ink/72">
            {fill(plan.replay ? copy.replayTag : copy.eyebrow, {
              n: String(plan.dive),
            })}
          </p>
          <p
            aria-hidden="true"
            className="rounded-full bg-ink px-2.5 py-1.5 text-foam tabular-nums"
          >
            {counting
              ? `${copy.read.countdown} ${count - step + 1}`
              : `${ticks}/${n} ${copy.read.checks}`}
          </p>
        </div>
        <h2
          id="slate-title"
          className="font-[650] font-display font-stretch-expanded text-[1.25rem] leading-[1.15] tracking-[-0.015em]"
        >
          {slateTitle(copy.title, plan)}
        </h2>
        <q
          dir="auto"
          className="slate-lines text-balance font-display font-medium text-[clamp(1.375rem,2.1vw,1.75rem)] leading-[1.3] tracking-[-0.015em]"
        >
          {plan.question}
        </q>
        <ul
          aria-label={copy.checksLabel}
          className="flex flex-col border-ink/12 border-t border-dashed [@media(max-aspect-ratio:6/5)]:grid [@media(max-aspect-ratio:6/5)]:grid-cols-2 [@media(max-aspect-ratio:6/5)]:gap-x-3"
        >
          {checks.map((check, i) => (
            <li
              key={check.name}
              data-on={i < ticks || undefined}
              className="group grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 border-ink/12 border-b border-dashed py-2 opacity-45 transition-opacity duration-300 ease-out data-on:opacity-100"
            >
              <span className="row-span-2 grid size-5 place-items-center rounded-md text-ink shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--color-ink)_32%,transparent)] transition-[background-color,box-shadow] duration-300 ease-out group-data-on:bg-ok group-data-on:shadow-none">
                <CheckIcon
                  aria-hidden="true"
                  strokeWidth={3}
                  className="size-3 scale-40 opacity-0 transition-[opacity,scale] delay-100 duration-250 ease-out group-data-on:scale-100 group-data-on:opacity-100"
                />
              </span>
              <b className="font-semibold text-[0.9375rem] leading-[1.3]">
                {check.name}
              </b>
              <span
                dir="auto"
                className="font-medium font-mono text-swell-deep text-xs tabular-nums leading-[1.5] [@media(max-aspect-ratio:6/5)]:hidden"
              >
                {check.value}
              </span>
            </li>
          ))}
        </ul>
        {plan.prior.length > 0 && !plan.replay && (
          <details className="group text-sm">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 font-medium text-swell-deep [&::-webkit-details-marker]:hidden">
              {copy.cargo.summary}
              <ChevronDown
                aria-hidden="true"
                className="size-3 transition-transform duration-200 ease-out group-open:rotate-180"
              />
            </summary>
            <ol className="mt-2 flex flex-col gap-1.5 rounded-xl bg-ink/6 p-3">
              {cargoRows(plan).map((message, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: the list is fixed while the slate is open
                  key={i}
                  data-new={i === plan.prior.length || undefined}
                  className="group/row grid grid-cols-[56px_minmax(0,1fr)] items-baseline gap-2.5 text-ink/72 data-new:font-medium data-new:text-ink"
                >
                  <span className="font-medium font-mono text-[11px] uppercase leading-[1.6] tracking-[0.08em]">
                    {message.role === "user"
                      ? copy.cargo.you
                      : copy.cargo.agent}
                  </span>
                  <q dir="auto" className="truncate [quotes:none]">
                    {message.text}
                  </q>
                </li>
              ))}
              <li
                dir="ltr"
                className="mt-1 border-ink/15 border-t border-dashed pt-2 font-medium font-mono text-swell-deep text-xs leading-[1.4]"
              >
                {fill(copy.cargo.wire, { n: String(plan.prior.length) })}
              </li>
            </ol>
          </details>
        )}
        <div className="mt-1 flex gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="min-h-12 border-ink/25 px-5 text-ink hover:bg-ink/8 hover:text-ink focus-visible:border-swell-deep focus-visible:ring-swell-deep/40"
          >
            {copy.cancel}
          </Button>
          <Button
            ref={go}
            size="lg"
            onClick={descend}
            className="descend relative min-h-12 flex-1 overflow-hidden rounded-[14px] bg-ink px-7 font-[650] font-display text-base text-foam leading-none tracking-[-0.01em] [font-stretch:112%] hover:bg-ink/88 focus-visible:border-swell-deep focus-visible:ring-swell-deep/40"
          >
            {copy.descend}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1 origin-left bg-accent motion-reduce:hidden rtl:origin-right"
              style={{
                scale: counting ? "1 1" : "0 1",
                transition: counting
                  ? `scale ${count * COUNT_MS}ms linear`
                  : "none",
              }}
            />
          </Button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {counting
          ? fill(copy.say.ready, { n: String(count) })
          : fill(copy.say.start, { q: plan.question })}
      </p>
    </dialog>
  );
}
