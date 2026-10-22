import { SEARCH_TOOL } from "#/constants/sea.constants";
import type { LlmCompleted, StreamEvent } from "#/generated/events.gen";
import type {
  DiveStep,
  StepContext,
  StepCopy,
  StepText,
} from "#/types/sea.types";
import { formatMs } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";

function choice(result: LlmCompleted, copy: StepCopy): string {
  if (result.decision === "answer") return copy.choseAnswer;
  if (result.decision === "text") return copy.choseText;
  return result.tools.includes(SEARCH_TOOL)
    ? copy.choseSearch
    : fill(copy.choseTool, { tool: toolList(result.tools) });
}

/** Tool names with repeats grouped: "get_project ×2, list_projects". */
export function toolList(tools: string[]): string {
  const counts = new Map<string, number>();
  for (const tool of tools) counts.set(tool, (counts.get(tool) ?? 0) + 1);
  return [...counts]
    .map(([tool, n]) => (n > 1 ? `${tool} ×${n}` : tool))
    .join(", ");
}

/** The stage label and the plain-language title of a dive step; `ended` once the run is over. */
export function stepText(
  step: DiveStep,
  copy: StepCopy,
  ended = false,
  ctx: Pick<StepContext, "carried" | "retrieved"> = {
    carried: 0,
    retrieved: [],
  },
): StepText {
  const { event } = step.event;
  const result = step.result?.event;
  switch (event.type) {
    case "request.started":
      return {
        label: copy.request,
        title: ctx.carried
          ? fill(copy.requestCarried, { n: String(ctx.carried) })
          : copy.requestTitle,
      };
    case "guardrails.checked": {
      const n = String(event.checks.length);
      const p = String(event.checks.filter((check) => check.passed).length);
      return step.kind === "abort"
        ? { label: copy.safety, title: fill(copy.safetyBlocked, { n, p }) }
        : { label: copy.safety, title: fill(copy.safetyPassed, { n }) };
    }
    case "cache.checked":
      return {
        label: copy.cache,
        title: event.hit ? copy.cacheHit : copy.cacheMiss,
      };
    case "llm.started": {
      const n = String(event.call);
      const label = fill(copy.modelCall, { n });
      return {
        label:
          event.call > 1 ? `${label} · ${fill(copy.loopRound, { n })}` : label,
        title:
          result?.type === "llm.completed"
            ? choice(result, copy)
            : ended
              ? copy.unfinished
              : copy.thinking,
      };
    }
    case "tool.called":
      return {
        label: fill(copy.toolCall, { tool: event.tool }),
        title:
          event.tool === SEARCH_TOOL
            ? copy.searching
            : fill(copy.running, { tool: event.tool }),
      };
    case "retrieval.completed": {
      const n = String(event.passages.length);
      const good = event.passages.filter((p) => p.above_threshold).length;
      return {
        label: copy.results,
        title: good
          ? fill(copy.resultsGood, { n, g: String(good) })
          : fill(copy.resultsNone, { n }),
      };
    }
    case "generation.started":
      return {
        label: copy.writing,
        title: event.context_chunks
          ? fill(copy.writingFrom, { n: String(event.context_chunks) })
          : copy.writingNone,
      };
    case "decision.made":
      return {
        label: copy.decision,
        title:
          event.action === "answer" ? copy.decisionAnswer : copy.decisionNoInfo,
      };
    case "citations.attached":
      return {
        label: copy.sources,
        title: event.citations.length
          ? fill(copy.sourcesChecked, {
              m: String(
                event.citations.filter((c) =>
                  ctx.retrieved.includes(c.chunk_id),
                ).length,
              ),
              n: String(event.citations.length),
            })
          : copy.sourcesNone,
      };
    case "request.finished":
      if (event.outcome === "answered") {
        return { label: copy.done, title: copy.seabedAnswered };
      }
      if (event.outcome === "no_information") {
        return { label: copy.done, title: copy.seabedNoInfo };
      }
      return { label: copy.stopped, title: copy.calledOff };
    default:
      return { label: copy.error, title: copy.errorTitle };
  }
}

/** The events whose evidence shows under a step: a model call that has finished shows only its result. */
export function stepEvidence(step: DiveStep, ended: boolean): StreamEvent[] {
  const done =
    step.event.event.type === "llm.started" && (step.result || ended);
  return [...(done ? [] : [step.event]), ...(step.result ? [step.result] : [])];
}

/** The raw event behind a step, as the server sent it. */
export function techLine(item: StreamEvent): string {
  return `${item.event.type} · event #${item.seq} · server +${formatMs(item.t_ms)}`;
}
