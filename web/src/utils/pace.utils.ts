import {
  DELTA_FROM,
  DELTA_SPAN,
  DWELL_MS,
  INSIDE,
} from "#/constants/pace.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { PaceClock } from "#/types/pace.types";
import { stepKindOf } from "#/utils/depth.utils";

/** Moves the clock to `now` (a `performance.now()` time): real time always runs, dive time only when not paused. */
export function advanceClock(clock: PaceClock, now: number): PaceClock {
  const dt = Math.max(now - clock.at, 0);
  return {
    ...clock,
    v: clock.paused ? clock.v : clock.v + dt * clock.speed,
    wall: clock.wall + dt,
    at: now,
  };
}

/**
 * When each event shows in a paced dive, in ms from the dive's start. A step holds the screen for
 * its dwell, and the events that close or feed it land inside it. No event shows before it really
 * arrived, so a slow server still sets the pace. Causal: a new event never moves an earlier one later.
 */
export function paceTimes(events: StreamEvent[]): number[] {
  const deltas = events.filter((item) => item.event.type === "text.delta");
  let slot = 0;
  let dwell = 0;
  let prev = 0;
  let delta = 0;
  let writing = false;
  return events.map((item) => {
    const { type } = item.event;
    const opens = stepKindOf(item.event) !== null;
    let at: number;
    if (opens) {
      at = slot + dwell;
      dwell = DWELL_MS[type] ?? 0;
      writing = type === "generation.started";
    } else if (type === "text.delta") {
      const share = delta++ / Math.max(deltas.length - 1, 1);
      at = slot + dwell * (DELTA_FROM + DELTA_SPAN * share);
    } else {
      // While writing, what closes the step comes after the streamed text, as in the stream.
      const inside = INSIDE[type] ?? 0.5;
      at =
        slot +
        dwell * (writing ? Math.max(inside, DELTA_FROM + DELTA_SPAN) : inside);
    }
    at = Math.max(at, item.t_ms, prev);
    if (opens) slot = at;
    prev = at;
    return at;
  });
}

/** How much of the answer has streamed by dive time `v`, 0 to 1, spread like the text deltas are. */
export function writtenShare(
  events: StreamEvent[],
  times: number[],
  v: number,
): number {
  const i = events.findIndex(
    (item) => item.event.type === "generation.started",
  );
  if (i < 0 || v < times[i]) return 0;
  const dwell = DWELL_MS["generation.started"] ?? 0;
  const k = (v - times[i]) / Math.max(dwell, 1);
  return Math.min(Math.max((k - DELTA_FROM) / DELTA_SPAN, 0), 1);
}
