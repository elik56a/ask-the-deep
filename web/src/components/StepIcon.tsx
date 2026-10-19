import { STEP_ICON_PATHS } from "#/constants/stepIcon.constants";
import type { StepState } from "#/types/chatSteps.types";

interface StepIconProps {
  state: StepState;
}

export function StepIcon({ state }: StepIconProps) {
  if (state === "running") {
    return (
      <span
        aria-hidden="true"
        className="size-3 animate-spin rounded-full border-2 border-line-strong border-t-accent motion-reduce:animate-none"
      />
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={state === "done" ? "text-ok" : "text-warn"}
    >
      <path
        d={STEP_ICON_PATHS[state]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
