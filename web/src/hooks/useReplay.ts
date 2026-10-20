import { useCallback, useEffect, useState } from "react";
import type { StreamEvent } from "#/generated/events.gen";

const TICK_MS = 100;

/** Plays a finished run's events again at their recorded times. */
export function useReplay(events: StreamEvent[]) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const end = events.at(-1)?.t_ms ?? 0;

  useEffect(() => {
    if (start === null) return;
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      setNow(elapsed);
      if (elapsed > end) setStart(null);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [start, end]);

  const replay = useCallback(() => {
    setNow(0);
    setStart(performance.now());
  }, []);

  return {
    events: start === null ? events : events.filter((item) => item.t_ms <= now),
    replaying: start !== null,
    replay,
  };
}
