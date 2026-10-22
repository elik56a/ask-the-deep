import { useCallback, useEffect, useState } from "react";
import { PACE_TICK_MS } from "#/constants/pace.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { PaceClock } from "#/types/pace.types";
import { advanceClock, paceTimes } from "#/utils/pace.utils";

/**
 * Plays a dive at a readable pace (ADR 0019): live events and replays alike show at their paced
 * times, with pause, speed and skip. Without `start()` every event shows at once (the surface).
 */
export function usePacedPlayer(events: StreamEvent[]) {
  const [clock, setClock] = useState<PaceClock | null>(null);
  const times = paceTimes(events);
  const end = times.at(-1) ?? 0;
  const finished = events.find(
    (item) => item.event.type === "request.finished",
  );
  const done = clock !== null && finished !== undefined && clock.v >= end;

  useEffect(() => {
    if (!clock || done) return;
    const timer = setTimeout(
      () => setClock((c) => c && advanceClock(c, performance.now())),
      PACE_TICK_MS,
    );
    return () => clearTimeout(timer);
  }, [clock, done]);

  const start = useCallback(() => {
    setClock({ v: 0, wall: 0, at: performance.now(), speed: 1, paused: false });
  }, []);
  const stop = useCallback(() => setClock(null), []);
  const skip = useCallback(() => {
    setClock((c) => c && { ...c, v: Number.POSITIVE_INFINITY });
  }, []);
  const setPaused = useCallback((paused: boolean) => {
    setClock((c) => c && { ...advanceClock(c, performance.now()), paused });
  }, []);
  const setSpeed = useCallback((speed: number) => {
    setClock((c) => c && { ...advanceClock(c, performance.now()), speed });
  }, []);

  return {
    events: clock ? events.filter((_, i) => times[i] <= clock.v) : events,
    playing: clock !== null && !done,
    paused: clock?.paused ?? false,
    speed: clock?.speed ?? 1,
    progress: clock && end > 0 ? Math.min(clock.v / end, 1) : 0,
    serverMs: finished ? finished.t_ms : (clock?.wall ?? 0),
    serverDone: finished !== undefined,
    start,
    stop,
    skip,
    setPaused,
    setSpeed,
  };
}
