import type { RequestFinished } from "#/generated/events.gen";

export type StageId = "guard" | "llm" | "tool" | "stream";

export interface TraceSpan {
  stage: StageId;
  start: number;
  end: number | null;
  call?: number;
  tool?: string;
}

export interface TraceTotals {
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ttftMs: number | null;
  latencyMs: number | null;
}

export interface Trace {
  spans: TraceSpan[];
  totals: TraceTotals;
  activeStages: StageId[];
  retrieved: string[];
  outcome: RequestFinished["outcome"] | null;
  lastMs: number;
}
