import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  COUNT_FROM,
  COUNT_MS,
  FIRST_TICK_MS,
  HELM_NOTCH,
  HELM_RING_R,
  HOLD_MS,
  PREDIVE_COPY,
  REPLAY_COUNT_FROM,
  TICK_MS,
  VEIL_FADE_MS,
} from "#/constants/predive.constants";
import { useHelm } from "#/hooks/useHelm";
import type { Lang } from "#/types/i18n.types";
import type { PreDiveCheck as Check, PreDivePlan } from "#/types/predive.types";
import { fill } from "#/utils/toolSteps.utils";

interface PreDiveCheckProps {
  lang: Lang;
  plan: PreDivePlan;
  checks: Check[];
  /** The dive starts now; the veil fades out over it, then `onGone`. */
  onDescend: () => void;
  onCancel: () => void;
  onGone: () => void;
}

const RING = 2 * Math.PI * HELM_RING_R;

export function PreDiveCheck({
  lang,
  plan,
  checks,
  onDescend,
  onCancel,
  onGone,
}: PreDiveCheckProps) {
  const copy = PREDIVE_COPY[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const go = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  const actions = useRef({ onDescend, onGone });
  actions.current = { onDescend, onGone };
  const [on, setOn] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [step, setStep] = useState(0);
  const [spun, setSpun] = useState(false);
  const n = checks.length;
  const count = plan.replay ? REPLAY_COUNT_FROM : COUNT_FROM;

  useHelm(
    canvas,
    ticks * HELM_NOTCH -
      (step * n * HELM_NOTCH) / count +
      (spun ? 2 * Math.PI : 0),
  );

  const gone = useRef(false);
  const leave = useRef(() => {
    if (gone.current) return;
    gone.current = true;
    for (const timer of timers.current) clearTimeout(timer);
    setOn(false);
    actions.current.onDescend();
    timers.current = [
      window.setTimeout(() => actions.current.onGone(), VEIL_FADE_MS),
    ];
  });

  useEffect(() => {
    dialog.current?.showModal();
    go.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOn(true)),
    );
    const at = (ms: number, act: () => void) =>
      timers.current.push(window.setTimeout(act, ms));
    for (let i = 0; i < n; i++)
      at(FIRST_TICK_MS + i * TICK_MS, () => setTicks(i + 1));
    const ready = FIRST_TICK_MS + n * TICK_MS + HOLD_MS;
    for (let k = 0; k < count; k++)
      at(ready + k * COUNT_MS, () => setStep(k + 1));
    at(ready + count * COUNT_MS, leave.current);
    return () => {
      cancelAnimationFrame(frame);
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, [n, count]);

  const counting = step > 0;
  const progress = counting ? (count - step) / count : ticks / n;
  const title = plan.replay
    ? fill(copy.title.replay, { n: String(plan.dive) })
    : plan.prior.length
      ? copy.title.again
      : copy.title.first;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="veil-title"
      data-on={on || undefined}
      data-ready={counting || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (on) onCancel();
      }}
      className="veil fixed inset-0 z-40 m-0 h-dvh max-h-none w-full max-w-none flex-col items-center overflow-y-auto border-0 px-[max(16px,env(safe-area-inset-left,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] pb-[calc(24px+env(safe-area-inset-bottom,0px))] text-text open:flex"
    >
      <div className="veil-card my-auto flex w-[min(640px,100%)] flex-col items-center gap-4.5 text-center">
        <div
          aria-hidden="true"
          className="mb-0.5 flex flex-col items-center gap-2.5"
        >
          <div className="relative size-49">
            <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_26%,transparent),transparent)] blur-sm" />
            <svg
              aria-hidden="true"
              viewBox="-70 -70 140 140"
              className="absolute inset-0 size-full overflow-visible"
            >
              <circle
                r={HELM_RING_R}
                fill="none"
                strokeWidth={2.5}
                className="stroke-line"
              />
              <circle
                r={HELM_RING_R}
                fill="none"
                strokeWidth={2.5}
                strokeLinecap="round"
                transform="rotate(-90)"
                strokeDasharray={RING}
                className="stroke-glow drop-shadow-[0_0_5px_color-mix(in_oklab,var(--color-glow)_70%,transparent)] motion-reduce:transition-none!"
                style={{
                  strokeDashoffset: RING * (1 - progress),
                  transition: counting
                    ? `stroke-dashoffset ${COUNT_MS}ms linear`
                    : "stroke-dashoffset 400ms var(--ease-out)",
                }}
              />
            </svg>
            <canvas ref={canvas} className="absolute inset-1.5 size-46" />
          </div>
          <p className="inline-flex items-baseline gap-2 rounded-full border border-line bg-case/40 px-3 py-1.5 font-medium font-mono text-[10px] text-muted uppercase leading-none tracking-[0.12em]">
            <b className="font-bold font-display font-stretch-expanded text-[1.0625rem] text-text tabular-nums leading-none tracking-normal">
              {counting ? count - step + 1 : `${ticks}/${n}`}
            </b>
            <span>{counting ? copy.read.countdown : copy.read.checks}</span>
          </p>
        </div>
        <p className="font-mono text-[11px] text-glow uppercase leading-none tracking-[0.12em]">
          {fill(plan.replay ? copy.replayTag : copy.eyebrow, {
            n: String(plan.dive),
          })}
        </p>
        <h2
          id="veil-title"
          className="text-balance font-bold font-display font-stretch-expanded text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] tracking-[-0.02em]"
        >
          {title}
        </h2>
        <q
          dir="auto"
          className="max-w-[30ch] text-balance font-medium text-[clamp(1.25rem,2.6vw,1.625rem)] leading-[1.35] tracking-[-0.01em]"
        >
          {plan.question}
        </q>
        <ul
          aria-label={copy.checksLabel}
          className={`grid w-full gap-2 text-start max-[519px]:grid-cols-1 ${n === 3 ? "grid-cols-3" : "grid-cols-2"}`}
        >
          {checks.map((check, i) => (
            <li
              key={check.name}
              data-on={i < ticks || undefined}
              className="group grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 rounded-xl border border-line bg-text/5 px-3.5 py-2.75 opacity-45 transition-[opacity,border-color,background-color] duration-350 ease-out data-on:border-[color-mix(in_oklab,var(--color-ok)_40%,var(--color-line))] data-on:bg-ok/8 data-on:opacity-100"
            >
              <span className="row-span-2 grid size-5 place-items-center rounded-md text-on-accent shadow-[inset_0_0_0_1.5px_var(--color-line-strong)] transition-[background-color,box-shadow] duration-300 ease-out group-data-on:bg-ok group-data-on:shadow-none">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="scale-40 opacity-0 transition-[opacity,scale] delay-100 duration-250 ease-out group-data-on:scale-100 group-data-on:opacity-100"
                >
                  <path
                    d="M3 8.5l3.2 3.2L13 4.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <b className="font-semibold text-[0.9375rem] leading-[1.3]">
                {check.name}
              </b>
              <span
                dir="auto"
                className="font-medium font-mono text-glow text-xs tabular-nums leading-[1.4]"
              >
                {check.value}
              </span>
            </li>
          ))}
        </ul>
        {plan.prior.length > 0 && !plan.replay && (
          <details className="group w-full text-center text-sm">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-glow [&::-webkit-details-marker]:hidden">
              {copy.cargo.summary}
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-open:rotate-180"
              >
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <ol className="mt-2 flex flex-col gap-1.5 rounded-[14px] border border-line p-3.5 text-start">
              {[
                ...plan.prior,
                { role: "user" as const, text: plan.question },
              ].map((message, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: the list is fixed while the veil is open
                  key={i}
                  data-new={i === plan.prior.length || undefined}
                  className="group/row grid grid-cols-[56px_minmax(0,1fr)] items-baseline gap-2.5 text-muted data-new:text-text"
                >
                  <span className="font-medium font-mono text-[11px] uppercase leading-[1.6] tracking-[0.08em] group-data-new/row:text-haze">
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
                className="mt-1 border-line border-t border-dashed pt-2 font-medium font-mono text-glow text-xs leading-[1.4]"
              >
                {fill(copy.cargo.wire, { n: String(plan.prior.length) })}
              </li>
            </ol>
          </details>
        )}
        <div className="mt-1.5 flex flex-wrap justify-center gap-2 max-[519px]:w-full max-[519px]:*:flex-1">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="min-h-13 px-5"
          >
            {copy.cancel}
          </Button>
          <Button
            ref={go}
            size="lg"
            onClick={() => {
              setSpun(true);
              leave.current();
            }}
            className="descend min-h-13 rounded-[14px] px-7 font-[650] font-display text-base leading-none tracking-[-0.01em] [font-stretch:112%]"
          >
            {copy.descend}
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
