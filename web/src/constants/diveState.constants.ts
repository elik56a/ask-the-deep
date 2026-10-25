import type { DiveState } from "#/types/diveState.types";

export const DIVE_START: DiveState = {
  mode: "rest",
  plan: null,
  chatState: "full",
  watching: null,
  fresh: null,
  returned: false,
};
