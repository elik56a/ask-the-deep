import { useEffect, useRef, useState } from "react";
import {
  COUNT_MS,
  FIRST_TICK_MS,
  HOLD_MS,
  TICK_MS,
  VEIL_FADE_MS,
} from "#/constants/predive.constants";

/**
 * The pre-dive check's clock: it opens the dialog, ticks off `checks` one by one, counts down from
 * `count` and then leaves on its own. `descend` leaves at once. Leaving calls `onDescend`, fades the
 * veil out over the dive, then calls `onGone`.
 */
export function usePreDiveClock(
  checks: number,
  count: number,
  onDescend: () => void,
  onGone: () => void,
) {
  const dialog = useRef<HTMLDialogElement>(null);
  const go = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const actions = useRef({ onDescend, onGone });
  actions.current = { onDescend, onGone };
  const [on, setOn] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [step, setStep] = useState(0);
  const [spun, setSpun] = useState(false);

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
    const ready = FIRST_TICK_MS + checks * TICK_MS + HOLD_MS;
    const plan: [number, () => void][] = [
      ...Array.from({ length: checks }, (_, i): [number, () => void] => [
        FIRST_TICK_MS + i * TICK_MS,
        () => setTicks(i + 1),
      ]),
      ...Array.from({ length: count }, (_, k): [number, () => void] => [
        ready + k * COUNT_MS,
        () => setStep(k + 1),
      ]),
      [ready + count * COUNT_MS, leave.current],
    ];
    timers.current = plan.map(([ms, act]) => window.setTimeout(act, ms));
    return () => {
      cancelAnimationFrame(frame);
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, [checks, count]);

  const descend = () => {
    setSpun(true);
    leave.current();
  };

  return { dialog, go, on, ticks, step, spun, descend };
}
