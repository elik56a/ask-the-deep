import { SEARCH_TOOL } from "#/constants/sea.constants";
import type {
  DiveStep,
  SayCopy,
  SayPart,
  StepContext,
  StepSay,
} from "#/types/sea.types";
import { formatMs } from "#/utils/format.utils";
import { toolList } from "#/utils/stepText.utils";
import { streamEnd } from "#/utils/streamWords.utils";
import { fill } from "#/utils/toolSteps.utils";

/** The narration under a step's title while it is in focus (v3); null when the step has none. */
export function stepSay(
  step: DiveStep,
  copy: SayCopy,
  ctx: StepContext,
  ended = false,
): StepSay | null {
  const { event } = step.event;
  const result = step.result?.event;
  const carried = ctx.carried > 0;
  switch (event.type) {
    case "request.started":
      return { text: carried ? copy.requestCarried : copy.request };
    case "guardrails.checked":
      return { text: step.kind === "abort" ? copy.guardBlocked : copy.guard };
    case "cache.checked":
      return { text: event.hit ? copy.cacheHit : copy.cacheMiss };
    case "llm.started": {
      if (event.call > 1) {
        return { text: fill(copy.llmRound, { n: String(event.call) }) };
      }
      if (result?.type === "llm.completed") {
        if (result.decision === "answer") return { text: copy.choseAnswer };
        if (result.decision === "text") return { text: copy.choseText };
        return {
          text: fill(copy.choseTool, { tool: toolList(result.tools) }),
        };
      }
      if (ended) return { text: copy.unfinished };
      return { text: carried ? copy.llmFirstCarried : copy.llmFirst };
    }
    case "tool.called":
      if (event.tool !== SEARCH_TOOL) {
        return { text: fill(copy.tool, { tool: event.tool }) };
      }
      return {
        text:
          event.args.query === ctx.question
            ? copy.search
            : carried
              ? copy.searchCarried
              : copy.searchMore,
        quote: event.args.query ?? "",
      };
    case "retrieval.completed":
      return {
        text: fill(copy.results, { t: event.threshold.toFixed(2) }),
      };
    case "generation.started":
      return {
        text: event.context_chunks ? copy.writingFrom : copy.writingNone,
      };
    case "decision.made":
      return {
        text: fill(
          event.action === "answer" ? copy.decisionAnswer : copy.decisionNoInfo,
          {
            s: event.best_score.toFixed(2),
            t: event.threshold.toFixed(2),
          },
        ),
      };
    case "citations.attached":
      return {
        text: event.citations.length ? copy.sources : copy.sourcesNone,
      };
    case "request.finished": {
      if (event.outcome !== "answered" && event.outcome !== "no_information") {
        return { text: copy.calledOff };
      }
      const t = formatMs(step.event.t_ms);
      if (ctx.skipped) return { text: fill(copy.seabedSkipped, { t }) };
      const k = Math.max(
        Math.round(ctx.wallMs / Math.max(step.event.t_ms, 1)),
        1,
      );
      return { text: fill(copy.seabed, { t, k: String(k) }) };
    }
    case "error":
      return { text: copy.error };
    default:
      return null;
  }
}

/** The narration in runs that stream on from `start`, the quoted query set apart at `{q}`. */
export function sayParts(say: StepSay, start: number): SayPart[] {
  const [before, after = ""] = say.text.split("{q}");
  if (say.quote === undefined) return [{ text: before, start, quote: false }];
  const quoteAt = streamEnd(before, start);
  return [
    { text: before, start, quote: false },
    { text: say.quote, start: quoteAt, quote: true },
    { text: after, start: streamEnd(say.quote, quoteAt), quote: false },
  ];
}
