import type { StreamEvent } from "#/generated/events.gen";

export type ZoneId = "sunlight" | "twilight" | "midnight" | "abyss" | "trench";

export interface Zone {
  id: ZoneId;
  from: number;
  to: number;
}

export type StepKind =
  | "start"
  | "guard"
  | "llm"
  | "tool"
  | "gen"
  | "decision"
  | "cite"
  | "seabed"
  | "abort";

export interface SeaPassage {
  score: number;
  above_threshold: boolean;
}

/** What stream events can do to the scene; positions are px down the water column. */
export interface SeaControls {
  reset: () => void;
  lamp: (on: boolean) => void;
  sonar: (px: number) => void;
  lanterns: (px: number, passages: SeaPassage[], threshold: number) => void;
  bubbles: (count: number) => void;
  seabed: (px: number) => void;
}

export type DiveMode = "rest" | "dive" | "ascend";

/** One card in the dive log: the event that opened it and the one that closed it, if any. */
export interface DiveStep {
  kind: StepKind;
  event: StreamEvent;
  result: StreamEvent | null;
}

export interface StepText {
  label: string;
  title: string;
}

/** Plain-language step copy; `{n}`, `{p}`, `{g}` and `{tool}` are filled in. */
export interface StepCopy {
  step: string;
  request: string;
  requestTitle: string;
  safety: string;
  safetyPassed: string;
  safetyBlocked: string;
  cache: string;
  cacheHit: string;
  cacheMiss: string;
  modelCall: string;
  loopRound: string;
  thinking: string;
  unfinished: string;
  choseSearch: string;
  choseTool: string;
  choseAnswer: string;
  choseText: string;
  toolCall: string;
  searching: string;
  running: string;
  results: string;
  resultsGood: string;
  resultsNone: string;
  writing: string;
  writingFrom: string;
  writingNone: string;
  decision: string;
  decisionAnswer: string;
  decisionNoInfo: string;
  sources: string;
  sourcesChecked: string;
  sourcesNone: string;
  done: string;
  seabedAnswered: string;
  seabedNoInfo: string;
  stopped: string;
  calledOff: string;
  error: string;
  errorTitle: string;
}

export interface DiveCopy {
  zones: Record<ZoneId, string>;
  steps: StepCopy;
  logLabel: string;
  /** Before the bold part, the bold part, after it. */
  guide: [string, string, string];
  follow: string;
  surface: string;
  replay: string;
}
