import { type RefObject, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  CONSOLE_LEAVE,
  CONSOLE_SWAP,
  EASE_OUT,
  REDUCED_MOTION_QUERY,
} from "#/constants/motion.constants";
import type { ChatState } from "#/types/chat.types";

const reduced = () => matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * The console's motion: at the seabed each change between full, pill and side slides it in
 * (`revealed`), and `leave` fades it out before the pre-dive check opens, then runs `then`. A second
 * `leave` while one is fading is dropped, so a double click can't open two checks.
 */
export function useConsoleMotion(
  box: RefObject<HTMLElement | null>,
  revealed: boolean,
  state: ChatState,
) {
  const shown = useRef(state);
  const leaving = useRef(false);

  useEffect(() => {
    const changed = shown.current !== state;
    shown.current = state;
    const el = box.current;
    if (!changed || !revealed || !el || reduced()) return;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${CONSOLE_SWAP.risePx}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: CONSOLE_SWAP.ms, easing: EASE_OUT },
    );
  }, [box, revealed, state]);

  return function leave(then: () => void): void {
    const el = box.current;
    if (leaving.current) return;
    if (!el || el.hidden || reduced()) {
      then();
      return;
    }
    leaving.current = true;
    el.animate(
      [
        { opacity: 1 },
        { opacity: 0, transform: `translateY(${CONSOLE_LEAVE.dropPx}px)` },
      ],
      { duration: CONSOLE_LEAVE.ms, easing: EASE_OUT, fill: "forwards" },
    ).finished.then((fade) => {
      // Hide it before the next paint, then drop the held frame so it shows normally next time.
      flushSync(then);
      fade.cancel();
      leaving.current = false;
    });
  };
}
