import type { RequestFinished } from "#/generated/events.gen";

export type HoodStatus = "idle" | "running" | RequestFinished["outcome"];

export interface CardCopy {
  requestStarted: string;
  guardrailsPassed: string;
  guardrailsBlocked: string;
  cache: string;
  cacheHit: string;
  cacheMiss: string;
  modelCall: string;
  decidedTools: string;
  decidedAnswer: string;
  decidedText: string;
  fallback: string;
  rejected: string;
  toolCall: string;
  toolDone: string;
  toolFailed: string;
  results: string;
  retrieval: string;
  reachModel: string;
  blockedBelow: string;
  gate: string;
  score: string;
  writingFrom: string;
  promptCacheHit: string;
  promptCacheMiss: string;
  decisionAnswer: string;
  decisionNoInfo: string;
  best: string;
  citationCheck: string;
  citationsMatched: string;
  noCitations: string;
  error: string;
  finished: string;
}

export interface HoodCopy {
  eyebrow: string;
  title: string;
  elapsed: string;
  status: Record<HoodStatus, string>;
  meters: { calls: string; tokens: string; cost: string; firstWord: string };
  trace: string;
  traceUnit: string;
  waiting: string;
  events: string;
  eventCount: string;
  span: { guard: string; llm: string; stream: string };
  card: CardCopy;
}
