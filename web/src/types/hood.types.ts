import type { RequestFinished } from "#/generated/events.gen";
import type { StageId } from "#/types/trace.types";

export type HoodStatus = "idle" | "running" | RequestFinished["outcome"];

export interface CardCopy {
  cacheHit: string;
  cacheMiss: string;
  decidedTools: string;
  decidedAnswer: string;
  decidedText: string;
  fallback: string;
  rejected: string;
  results: string;
  reachModel: string;
  blockedBelow: string;
  gate: string;
  score: string;
  promptCacheHit: string;
  promptCacheMiss: string;
  best: string;
  citationsMatched: string;
  noCitations: string;
  /** `{v}` the prompt version. */
  prompt: string;
  /** `{n}` earlier messages carried. */
  history: string;
  /** `{model}` the model's name. */
  thinkingWith: string;
  /** `{in}` and `{out}` token counts. */
  tokens: string;
  ok: string;
  wordsStreamed: string;
}

export interface HoodCopy {
  status: Record<HoodStatus, string>;
  meters: { calls: string; tokens: string; cost: string; firstWord: string };
  stages: Record<StageId, string>;
  card: CardCopy;
}
