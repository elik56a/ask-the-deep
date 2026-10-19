import { CHAT_COPY } from "#/constants/chat.constants";
import type { RequestFinished, StreamEvent } from "#/generated/events.gen";
import type { ChatStep, StepsCopy } from "#/types/chatSteps.types";
import type { Lang } from "#/types/i18n.types";
import { toolStepLabel } from "#/utils/toolSteps.utils";

function finish(
  steps: ChatStep[],
  outcome: RequestFinished["outcome"],
  copy: StepsCopy,
): void {
  const write = steps.find((step) => step.id === "write");
  if (outcome === "answered" || outcome === "no_information") {
    const final: ChatStep =
      outcome === "answered"
        ? { id: "write", label: copy.written, state: "done" }
        : { id: "write", label: copy.noInfo, state: "empty" };
    if (write) Object.assign(write, final);
    else steps.push(final);
    return;
  }
  for (const step of steps) {
    if (step.state === "running") step.state = "failed";
  }
  if (!steps.some((step) => step.state === "failed")) {
    steps.push({ id: "stopped", label: copy.stopped, state: "failed" });
  }
}

/** The visitor-facing progress steps: one per stage, labelled in plain words. */
export function chatSteps(events: StreamEvent[], lang: Lang): ChatStep[] {
  const copy = CHAT_COPY[lang].steps;
  const steps: ChatStep[] = [];
  const openTools = new Map<string, ChatStep>();

  for (const { event } of events) {
    switch (event.type) {
      case "guardrails.checked": {
        const passed = event.checks.every((check) => check.passed);
        steps.push({
          id: "guard",
          label: passed ? copy.checked : copy.blocked,
          state: passed ? "done" : "failed",
        });
        break;
      }
      case "tool.called": {
        const step: ChatStep = {
          id: `tool-${steps.length}`,
          label: toolStepLabel(event, lang),
          state: "running",
        };
        steps.push(step);
        openTools.set(event.tool, step);
        break;
      }
      case "tool.completed": {
        const step = openTools.get(event.tool);
        if (!step) break;
        step.label = toolStepLabel(event, lang);
        step.state = !event.ok
          ? "failed"
          : event.result_count === 0
            ? "empty"
            : "done";
        openTools.delete(event.tool);
        break;
      }
      case "generation.started":
        steps.push({ id: "write", label: copy.writing, state: "running" });
        break;
      case "request.finished":
        finish(steps, event.outcome, copy);
        break;
    }
  }
  return steps;
}
