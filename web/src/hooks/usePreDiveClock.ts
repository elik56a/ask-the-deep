import { useEffect, useRef, useState } from "react";
import { SLATE_EXIT_MS } from "#/constants/predive.constants";
import type { PreDiveClock } from "#/types/predive.types";
import { preDiveBeats } from "#/utils/predive.utils";

const clearTimers = (timers: number[]) => {
  for (const timer of timers) clearTimeout(timer);
};

/**
 * The buddy check's clock: it opens the dialog, plays `preDiveBeats` and then leaves on its own.
 * `descend` leaves at once. Leaving calls `onDescend` (the diver jumps), drops the slate away,
 * then calls `onGone`.
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
  const [left, setLeft] = useState(false);
  const [clock, setClock] = useState<PreDiveClock>({ ticks: 0, step: 0 });

  const gone = useRef(false);
  const leave = useRef(() => {
    if (gone.current) return;
    gone.current = true;
    clearTimers(timers.current);
    setOn(false);
    setLeft(true);
    actions.current.onDescend();
    timers.current = [
      window.setTimeout(() => actions.current.onGone(), SLATE_EXIT_MS),
    ];
  });

  useEffect(() => {
    dialog.current?.showModal();
    go.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOn(true)),
    );
    timers.current = preDiveBeats(checks, count).map(
      ({ at, leave: last, ...next }) =>
        window.setTimeout(() => (last ? leave.current() : setClock(next)), at),
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimers(timers.current);
    };
  }, [checks, count]);

  return { dialog, go, on, left, ...clock, descend: leave.current };
}
