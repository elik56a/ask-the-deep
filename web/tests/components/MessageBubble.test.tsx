import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MessageBubble } from "#/components/MessageBubble";
import type { StreamEvent } from "#/generated/events.gen";
import type { ChatMessage } from "#/types/chat.types";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const answer = (events: StreamEvent[]): ChatMessage => ({
  id: "a1",
  role: "assistant",
  parts: [
    ...events.map((data) => ({ type: "data-event" as const, data })),
    { type: "text", text: "Eliyahu works with React." },
  ],
});

const render = (message: ChatMessage) =>
  renderToStaticMarkup(
    <MessageBubble
      message={message}
      lang="en"
      focusChunk={null}
      onFocusChunk={() => {}}
    />,
  );

it("shows the answer in a labelled card that glows while it streams", () => {
  const html = render(answer(stream([EVENT_SAMPLES["generation.started"]])));

  expect(html).toContain("Answer");
  expect(html).toContain("Eliyahu works with React.");
  expect(html).toContain('data-live="true"');
});

it("stops glowing once the run has finished", () => {
  const html = render(
    answer(
      stream([
        EVENT_SAMPLES["generation.started"],
        EVENT_SAMPLES["request.finished"],
      ]),
    ),
  );

  expect(html).not.toContain('data-live="true"');
});
