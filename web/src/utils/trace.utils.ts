import type { StreamEvent } from "#/generated/events.gen";
import type {
  StageId,
  Trace,
  TraceSpan,
  TraceTotals,
} from "#/types/trace.types";

function closeSpan(
  spans: TraceSpan[],
  match: (span: TraceSpan) => boolean,
  end: number,
): void {
  const span = [...spans]
    .reverse()
    .find((item) => item.end === null && match(item));
  if (span) span.end = end;
}

function addCall(
  totals: TraceTotals,
  input: number,
  output: number,
  cost: number,
) {
  totals.modelCalls += 1;
  totals.inputTokens += input;
  totals.outputTokens += output;
  totals.costUsd += cost;
}

/** Ruler marks for a waterfall spanning `domainMs`: a round step, at most six marks. */
export function rulerTicks(domainMs: number): number[] {
  const step =
    [50, 100, 250, 500, 1000, 2000, 5000].find(
      (size) => domainMs / size <= 6,
    ) ?? 10000;
  const ticks: number[] = [];
  for (let at = 0; at <= domainMs; at += step) ticks.push(at);
  return ticks;
}

export function buildTrace(events: StreamEvent[]): Trace {
  const spans: TraceSpan[] = [];
  const totals: TraceTotals = {
    modelCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    ttftMs: null,
    latencyMs: null,
  };
  const retrieved = new Set<string>();
  let outcome: Trace["outcome"] = null;
  let lastMs = 0;

  for (const { t_ms, event } of events) {
    lastMs = Math.max(lastMs, t_ms);
    switch (event.type) {
      case "guardrails.checked":
        spans.push({ stage: "guard", start: 0, end: t_ms });
        break;
      case "llm.started":
        spans.push({ stage: "llm", call: event.call, start: t_ms, end: null });
        break;
      case "llm.completed":
        closeSpan(spans, (span) => span.call === event.call, t_ms);
        addCall(
          totals,
          event.input_tokens,
          event.output_tokens,
          event.cost_usd,
        );
        break;
      case "tool.called":
        spans.push({ stage: "tool", tool: event.tool, start: t_ms, end: null });
        break;
      case "tool.completed":
        closeSpan(spans, (span) => span.tool === event.tool, t_ms);
        for (const id of event.passage_ids) retrieved.add(id);
        break;
      case "generation.started":
        spans.push({ stage: "stream", start: t_ms, end: null });
        break;
      case "usage.reported":
        // The server's totals are the source of truth once they arrive.
        Object.assign(totals, {
          inputTokens: event.input_tokens,
          outputTokens: event.output_tokens,
          costUsd: event.cost_usd,
          ttftMs: event.ttft_ms,
          latencyMs: event.latency_ms,
        });
        break;
      case "request.finished":
        outcome = event.outcome;
        for (const span of spans) span.end ??= t_ms;
        break;
    }
  }

  const activeStages: StageId[] = [
    ...new Set(
      spans.filter((span) => span.end === null).map((span) => span.stage),
    ),
  ];
  return {
    spans,
    totals,
    activeStages,
    retrieved: [...retrieved],
    outcome,
    lastMs,
  };
}
