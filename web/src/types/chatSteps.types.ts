export type StepState = "running" | "done" | "empty" | "failed";

export interface ChatStep {
  id: string;
  label: string;
  state: StepState;
}

export interface StepsCopy {
  checked: string;
  blocked: string;
  writing: string;
  written: string;
  noInfo: string;
  stopped: string;
  doneIn: string;
  showSteps: string;
  hideSteps: string;
}
