import type { StepState } from "#/types/chatSteps.types";

export const STEP_ICON_PATHS: Record<Exclude<StepState, "running">, string> = {
  done: "M3 8.5l3 3 7-7",
  empty: "M4 8h8",
  failed: "M4.5 4.5l7 7M11.5 4.5l-7 7",
};
