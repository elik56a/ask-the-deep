import { PACE_ESTIMATE_MS } from "#/constants/predive.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type {
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
