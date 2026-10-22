import { useEffect, useRef } from "react";
import { REVEAL_AFTER_SKIP_MS, REVEAL_MS } from "#/constants/pace.constants";

/** The answer waits for the seabed: once `ready` during the dive, the chat comes back after the report has been read. */
export function useRevealTimer(
  diving: boolean,
  ready: boolean,
  skipped: boolean,
  onReveal: () => void,
): void {
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  useEffect(() => {
    if (!diving || !ready) return;
    const timer = setTimeout(
      () => reveal.current(),
      skipped ? REVEAL_AFTER_SKIP_MS : REVEAL_MS,
    );
    return () => clearTimeout(timer);
  }, [diving, ready, skipped]);
}
