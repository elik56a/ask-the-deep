import {
  COUNT_MS,
  FIRST_TICK_MS,
  HOLD_MS,
  PACE_ESTIMATE_MS,
  TICK_MS,
} from "#/constants/predive.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { PastMessage } from "#/types/chat.types";
import type {
  PreDiveBeat,
  PreDiveCheck,
  PreDiveCopy,
  PreDivePlan,
} from "#/types/predive.types";
import { formatMs } from "#/utils/format.utils";
import { paceTimes } from "#/utils/pace.utils";
import { fill } from "#/utils/toolSteps.utils";

const line = (
  [name, value]: [string, string],
  values: Record<string, string>,
) => ({
  name,
  value: fill(value, values),
});

/**
 * Everything true before the request leaves, one line each: four for a new question, three for a
 * replay of a recorded dive (`events`), whose real pace and server time are already known.
 */
export function preDiveChecks(
  copy: PreDiveCopy,
  plan: PreDivePlan,
  events: StreamEvent[],
): PreDiveCheck[] {
  const { checks } = copy;
  const paceMs = plan.replay
    ? (paceTimes(events).at(-1) ?? 0)
    : PACE_ESTIMATE_MS;
  const paced = line(checks.paced, { s: String(Math.round(paceMs / 1000)) });
  if (plan.replay) {
    const serverMs = events.at(-1)?.t_ms ?? 0;
    return [
      line(checks.recording, { n: String(events.length) }),
      line(checks.timings, { t: formatMs(serverMs) }),
      paced,
    ];
  }
  return [
    line(checks.packed, { n: String(plan.question.length) }),
    plan.prior.length
      ? line(checks.carried, { n: String(plan.prior.length) })
      : line(checks.fresh, {}),
    line(checks.unstored, {}),
    paced,
  ];
}

/** The slate's heading: a first dive, a follow-up, or a replay of dive n. */
export function slateTitle(
  title: PreDiveCopy["title"],
  plan: PreDivePlan,
): string {
  if (plan.replay) return fill(title.replay, { n: String(plan.dive) });
  return plan.prior.length ? title.again : title.first;
}

/** What the follow-up carries: the earlier messages, then the new question. */
export function cargoRows(plan: PreDivePlan): PastMessage[] {
  return [...plan.prior, { role: "user", text: plan.question }];
}

/** The buddy check's timeline: a tick per check, a pause, one beat per count, then the leave. */
export function preDiveBeats(checks: number, count: number): PreDiveBeat[] {
  const ready = FIRST_TICK_MS + checks * TICK_MS + HOLD_MS;
  const ticked = Array.from({ length: checks }, (_, i) => ({
    at: FIRST_TICK_MS + i * TICK_MS,
    ticks: i + 1,
    step: 0,
    leave: false,
  }));
  const counted = Array.from({ length: count + 1 }, (_, k) => ({
    at: ready + k * COUNT_MS,
    ticks: checks,
    step: Math.min(k + 1, count),
    leave: k === count,
  }));
  return [...ticked, ...counted];
}
