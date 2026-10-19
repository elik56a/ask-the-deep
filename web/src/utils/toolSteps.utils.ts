import {
  TOOL_STEP_FALLBACK,
  TOOL_STEPS,
} from "#/constants/toolSteps.constants";
import type { ToolCalled, ToolCompleted } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import type { ToolStepCopy } from "#/types/toolSteps.types";

function fill(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{(\w+)\}/g,
    (placeholder, key: string) => values[key] ?? placeholder,
  );
}

function doneTemplate(copy: ToolStepCopy, event: ToolCompleted): string {
  if (!event.ok && copy.failed) return copy.failed;
  if (event.result_count === 0 && copy.doneNone) return copy.doneNone;
  if (event.result_count === 1 && copy.doneOne) return copy.doneOne;
  return copy.done;
}

export function toolStepLabel(
  event: ToolCalled | ToolCompleted,
  lang: Lang,
): string {
  const copy = TOOL_STEPS[lang][event.tool] ?? TOOL_STEP_FALLBACK[lang];
  if (event.type === "tool.called") return fill(copy.running, event.args);
  return fill(doneTemplate(copy, event), { n: String(event.result_count) });
}
