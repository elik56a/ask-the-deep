import type { ChatState } from "#/types/chat.types";
import type { PreDivePlan } from "#/types/predive.types";
import type { DiveMode } from "#/types/sea.types";

/** The page's dive: where it is, what the buddy check will send, and which dive is on screen. */
export interface DiveState {
  mode: DiveMode;
  plan: PreDivePlan | null;
  /** The chat's shape at the seabed; only read in "reveal". */
  chatState: ChatState;
  /** An earlier dive picked with "Watch again", or null for the newest. */
  watching: number | null;
  /** A dive asked at the surface without watching it, marked fresh in the thread. */
  fresh: number | null;
  /** The chat has stepped aside for a dive, so it surfaces with an entrance from now on. */
  returned: boolean;
}

export type DiveAction =
  | { type: "plan"; plan: PreDivePlan }
  | { type: "sent"; dive: number }
  | { type: "clear" }
  | { type: "cancel" }
  | { type: "gone" }
  | { type: "reveal" }
  | { type: "fold" }
  | { type: "chat"; chatState: ChatState }
  | { type: "mode"; mode: DiveMode };
