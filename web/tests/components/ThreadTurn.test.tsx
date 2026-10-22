import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ThreadTurn } from "#/components/ThreadTurn";
import type { StreamEvent } from "#/generated/events.gen";
import type { ChatMessage } from "#/types/chat.types";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const question: ChatMessage = {
  id: "q1",
  role: "user",
  parts: [{ type: "text", text: "What does he build?" }],
};
const answer = (events: StreamEvent[]): ChatMessage => ({
  id: "a1",
  role: "assistant",
  parts: [
    ...events.map((data) => ({ type: "data-event" as const, data })),
    { type: "text", text: "Eliyahu works with React." },
  ],
});
const FINISHED = stream([
  EVENT_SAMPLES["llm.started"],
  EVENT_SAMPLES["llm.completed"],
  EVENT_SAMPLES["usage.reported"],
  EVENT_SAMPLES["citations.attached"],
  EVENT_SAMPLES["request.finished"],
]);

const render = (reply: ChatMessage | null, fresh = false) =>
  renderToStaticMarkup(
    <ThreadTurn
      turn={{ dive: 2, question, answer: reply }}
      lang="en"
      fresh={fresh}
      onWatch={() => {}}
      focusChunk={null}
      onFocusChunk={() => {}}
    />,
  );

it("reads question, answer, sources, then one line of dive stats", () => {
  const html = render(answer(FINISHED));
  const order = [
    "What does he build?",
    "Answer",
    "Eliyahu works with React.",
    "Sources the answer used",
    "Skills › A",
    "Dive <b",
    "Watch again ↺",
  ].map((text) => html.indexOf(text));
  expect(order.every((at) => at >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(html).toContain("$0.000419");
});

it("waits with a pending line until the run has finished", () => {
  const html = render(answer(stream([EVENT_SAMPLES["generation.started"]])));
  expect(html).toContain("The agent is answering at the surface…");
  expect(html).not.toContain("Eliyahu works with React.");
  expect(html).not.toContain("Watch again");
});

it("marks the turn that just came back", () => {
  expect(render(answer(FINISHED), true)).toContain('data-new="true"');
  expect(render(answer(FINISHED))).not.toContain('data-new="true"');
});
