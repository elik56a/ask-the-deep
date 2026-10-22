import { expect, it } from "vitest";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import { threadTurns, turnMeta } from "#/utils/thread.utils";
import { buildTrace } from "#/utils/trace.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const message = (id: string, role: "user" | "assistant"): ChatMessage => ({
  id,
  role,
  parts: [{ type: "text", text: id }],
});

it("pairs each question with the answer after it, one dive each", () => {
  const turns = threadTurns([
    message("q1", "user"),
    message("a1", "assistant"),
    message("q2", "user"),
  ]);
  expect(
    turns.map((turn) => [turn.dive, turn.question.id, turn.answer?.id]),
  ).toEqual([
    [1, "q1", "a1"],
    [2, "q2", undefined],
  ]);
});

it("ignores an answer with no question before it", () => {
  expect(threadTurns([message("a0", "assistant")])).toEqual([]);
});

it("writes the stats line from the run's own totals", () => {
  const trace = buildTrace(
    stream([
      EVENT_SAMPLES["llm.started"],
      EVENT_SAMPLES["llm.completed"],
      EVENT_SAMPLES["usage.reported"],
      EVENT_SAMPLES["request.finished"],
    ]),
  );
  expect(turnMeta(CHAT_COPY.en.meta.stats, trace)).toBe(
    `2.91 s · ${trace.totals.modelCalls} model calls · $0.000419`,
  );
  expect(turnMeta(CHAT_COPY.he.meta.stats, trace)).toContain("קריאות למודל");
});
