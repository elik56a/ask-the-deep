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
  /** On the sand with the full chat: the view lifts, the water clears and the lights come up. */
  landed: (on: boolean) => void;
  /** The step log is in view: the scene centres in the water beyond it. */
  shifted: (on: boolean) => void;
  /** Starts loading the deep models and the seabed props, once. */
  loadDeep: () => void;
  /** Before a dive: the diver swims up close and the camera comes down to the water. */
  ready: (on: boolean) => void;
  /**
   * The page follows the dive down: the diver stays head down, since a rise then is the page
   * snapping back from a scroll past the latest step (a touch flick's momentum), not an ascent.
   */
  follow: (on: boolean) => void;
  /** The giant stride; `entered` runs as his head goes under (at once without motion). */
  jump: (entered: () => void) => void;
}

export type DiveMode = "rest" | "intro" | "dive" | "reveal" | "ascend";

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
  /** `{n}` earlier messages travel with a follow-up. */
  requestCarried: string;
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

/** One corner of the dive profile: when, how deep (in zones), and the stage that took us there. */
export interface ProfilePoint {
  t: number;
  zone: number;
  kind: StepKind;
}

export interface SeabedCopy {
  /** `{n}` steps, `{m}` depth, `{t}` time. */
  profileLabel: string;
  axisNote: string;
  earlyEnd: string;
  receipt: {
    total: string;
    calls: string;
    tokens: string;
    cost: string;
    outcome: string;
  };
}

/**
 * What a step's narration says, under its title while it is in focus. `{q}` is the search query
 * (shown quoted); `{n}`, `{t}`, `{s}`, `{k}` and `{tool}` are filled in.
 */
export interface SayCopy {
  request: string;
  requestCarried: string;
  guard: string;
  guardBlocked: string;
  cacheHit: string;
  cacheMiss: string;
  llmFirst: string;
  llmFirstCarried: string;
  llmRound: string;
  choseTool: string;
  choseAnswer: string;
  choseText: string;
  unfinished: string;
  search: string;
  searchCarried: string;
  /** A search the model asked for after the first one, which runs on the question as typed. */
  searchMore: string;
  tool: string;
  results: string;
  writingFrom: string;
  writingNone: string;
  decisionAnswer: string;
  decisionNoInfo: string;
  sources: string;
  sourcesNone: string;
  seabed: string;
  seabedSkipped: string;
  calledOff: string;
  error: string;
}

/** A step's narration; `quote` fills the text's `{q}`. */
export interface StepSay {
  text: string;
  quote?: string;
}

/** What the cards know beyond the events: the conversation and the playback. */
export interface StepContext {
  /** The visitor's question; the first search runs on it as typed. */
  question: string;
  /** Earlier messages sent with this question. */
  carried: number;
  /** The visitor skipped to the end. */
  skipped: boolean;
  /** Real time the dive has played, for "about N× slower". */
  wallMs: number;
  /** Passages this dive's search returned. */
  retrieved: string[];
}

export interface DiveCopy {
  zones: Record<ZoneId, string>;
  steps: StepCopy;
  say: SayCopy;
  logLabel: string;
  seabed: SeabedCopy;
  /** The server panel; a `[short, wide]` label adds its second part on wide screens only. */
  hud: {
    label: string;
    from: string;
    serverTime: string;
    calls: string;
    tokens: [string, string];
    cost: string;
    firstWord: [string, string];
  };
  /** The depth tag's air reading above the water; `{t}` is °C. */
  air: string;
  follow: string;
  /** At the seabed: the heading focus lands on, and what a screen reader hears by outcome. */
  back: { title: string; answered: string; empty: string };
  surface: string;
  replay: string;
  playback: PlaybackCopy;
}

/** The paced dive's controls; `{n}` is the dive number, `{t}` a time. */
export interface PlaybackCopy {
  label: string;
  dive: string;
  pause: string;
  resume: string;
  speed: string;
  skip: string;
  serverRunning: string;
  serverDone: string;
}

/** A run of narration and the word it starts streaming at; `quote` marks the visitor's words. */
export interface SayPart {
  text: string;
  start: number;
  quote: boolean;
}
