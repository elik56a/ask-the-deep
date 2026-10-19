import { useEffect, useState } from "react";

/**
 * Reveals items one at a time, each visible for at least `minMs`.
 * Starts complete when `settled` is already true at mount (a restored chat).
 */
export function usePacedCount(
  target: number,
  settled: boolean,
  minMs: number,
): number {
  const [shown, setShown] = useState(() => (settled ? target : 0));

  useEffect(() => {
    if (shown >= target) return;
    const timer = setTimeout(
      () => setShown((count) => count + 1),
      shown === 0 ? 0 : minMs,
    );
    return () => clearTimeout(timer);
  }, [shown, target, minMs]);

  return Math.min(shown, target);
}
