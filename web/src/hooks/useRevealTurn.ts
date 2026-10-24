import { type RefObject, useEffect } from "react";

/**
 * Keeps the newest turn as far down the thread as fits, with its question still in view at the
 * top, while it grows (an answer typing out). Runs again whenever a turn is added.
 */
export function useRevealTurn(
  listRef: RefObject<HTMLOListElement | null>,
  count: number,
) {
  useEffect(() => {
    const list = listRef.current;
    const turn = list?.lastElementChild;
    if (!list || !turn || count === 0) return;
    const reveal = () => {
      const top =
        turn.getBoundingClientRect().top -
        list.getBoundingClientRect().top +
        list.scrollTop -
        6;
      list.scrollTop = Math.min(top, list.scrollHeight - list.clientHeight);
    };
    const observer = new ResizeObserver(reveal);
    observer.observe(turn);
    return () => observer.disconnect();
  }, [listRef, count]);
}
