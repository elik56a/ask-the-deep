import type { DiveAction, DiveState } from "#/types/diveState.types";
import type { DiveMode } from "#/types/sea.types";

/** The page's dive transitions, in one place so each is named and tested. */
export function diveReducer(state: DiveState, action: DiveAction): DiveState {
  switch (action.type) {
    case "plan": {
      const { plan } = action;
      const watching = plan.replay ? plan.dive : null;
      return {
        ...state,
        plan,
        mode: "intro",
        watching,
        fresh: null,
        returned: true,
      };
    }
    case "sent":
      return { ...state, watching: null, fresh: action.dive };
    case "clear":
      return { ...state, mode: "rest", watching: null, fresh: null };
    case "cancel":
      return { ...state, mode: "rest", plan: null };
    case "gone":
      return { ...state, plan: null };
    case "reveal":
      return { ...state, mode: "reveal", chatState: "full" };
    case "fold":
      return state.mode === "reveal" && state.chatState === "full"
        ? { ...state, chatState: "pill" }
        : state;
    case "chat":
      return { ...state, chatState: action.chatState };
    case "mode":
      return { ...state, mode: action.mode };
  }
}

/** The water is on screen: the dive, the seabed and the ascent. */
export function isUnderwater(mode: DiveMode): boolean {
  return mode === "dive" || mode === "reveal" || mode === "ascend";
}

/** The chat's entrance animation: rising at the seabed, or surfacing back after a dive. */
export function consoleEntrance({ mode, returned }: DiveState): string {
  if (mode === "reveal") return "console-rise";
  return returned && mode === "rest" ? "console-surface" : "";
}
