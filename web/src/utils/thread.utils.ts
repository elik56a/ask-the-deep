import type { ChatMessage } from "#/types/chat.types";
import type { ThreadTurn } from "#/types/thread.types";
import type { Trace } from "#/types/trace.types";
import { formatMs, formatUsd } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";

/** Pairs each question with the answer that follows it: one turn, and one dive, per question. */
export function threadTurns(messages: ChatMessage[]): ThreadTurn[] {
  const turns: ThreadTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ dive: turns.length + 1, question: message, answer: null });
    } else if (message.role === "assistant" && turns.length > 0) {
      turns[turns.length - 1].answer = message;
    }
  }
  return turns;
}

/** The quiet stats line under an answer: time, model calls and cost, from the run's own events. */
export function turnMeta(template: string, trace: Trace): string {
  return fill(template, {
    t: formatMs(trace.totals.latencyMs ?? trace.lastMs),
    calls: String(trace.totals.modelCalls),
    cost: formatUsd(trace.totals.costUsd),
  });
}
