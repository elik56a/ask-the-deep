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
