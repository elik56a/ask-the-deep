import { readFileSync } from "node:fs";
import {
  parseJsonEventStream,
  readUIMessageStream,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from "ai";
import { expect, it } from "vitest";
import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
} from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import {
  chatRequestBody,
  isChatMessages,
  latestAnswer,
  messageCitations,
  messageError,
  messageEvents,
  messageText,
} from "#/utils/chat.utils";

const capturedStream = readFileSync(
  new URL("../fixtures/chat-stream.sse", import.meta.url),
  "utf8",
);

async function readWithTheAiSdk(raw: string): Promise<ChatMessage> {
  const chunks = parseJsonEventStream({
    stream: new Blob([raw]).stream(),
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(
        result,
        controller: TransformStreamDefaultController<UIMessageChunk>,
      ) {
        if (!result.success) throw new Error("The AI SDK rejected a chunk");
        controller.enqueue(result.value);
      },
    }),
  );
  let last: ChatMessage | undefined;
  for await (const message of readUIMessageStream<ChatMessage>({
    stream: chunks,
  })) {
    last = message;
  }
  if (!last) throw new Error("No message");
  return last;
}

it("the AI SDK reads a real server stream into text and events", async () => {
  expect(
    capturedStream,
    "fixture is empty: recapture it (see TASKS P3.2)",
  ).not.toBe("");
  const message = await readWithTheAiSdk(capturedStream);
  expect(messageText(message)).toContain("offline test model");
  const types = messageEvents(message).map((e) => e.event.type);
  expect(types[0]).toBe("request.started");
  expect(types).toContain("llm.completed");
  expect(types).toContain("tool.called");
  expect(types.at(-1)).toBe("request.finished");
});

const message = (
  role: "user" | "assistant",
  text: string,
  id = crypto.randomUUID(),
): ChatMessage => ({ id, role, parts: [{ type: "text", text }] });

it("sends the last message as the question and the rest as history", () => {
  const body = chatRequestBody(
    [
      message("user", "Where does he work?"),
      message("assistant", "At Phytech."),
      message("user", "What does he do there?"),
    ],
    "session-token",
  );
  expect(body).toEqual({
    question: "What does he do there?",
    history: [
      { role: "user", text: "Where does he work?" },
      { role: "assistant", text: "At Phytech." },
    ],
    session: "session-token",
  });
});

it("collects the sources an answer cites", () => {
  const citation = {
    chunk_id: "skills.md#a",
    source: "skills.md",
    breadcrumb: "Skills › A",
    excerpt: "React and FastAPI.",
  };
  expect(
    messageCitations([
      {
        request_id: "r",
        seq: 1,
        t_ms: 0,
        event: { type: "llm.started", call: 1 },
      },
      {
        request_id: "r",
        seq: 2,
        t_ms: 5,
        event: { type: "citations.attached", citations: [citation] },
      },
    ]),
  ).toEqual([citation]);
});

it("picks the newest answer, even while a new question waits", () => {
  const first = message("assistant", "One");
  const second = message("assistant", "Two");
  expect(
    latestAnswer([message("user", "Q"), first, message("user", "Q2"), second]),
  ).toBe(second);
  expect(latestAnswer([first, message("user", "Q3")])).toBe(first);
  expect(latestAnswer([message("user", "Q")])).toBeUndefined();
});

it("keeps history within the server's limits", () => {
  const long = Array.from({ length: 30 }, (_, i) =>
    message(i % 2 ? "assistant" : "user", "x".repeat(MAX_HISTORY_CHARS + 5)),
  );
  const { history } = chatRequestBody([...long, message("user", "q")], "s");
  expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
  expect(history.every((m) => m.text.length === MAX_HISTORY_CHARS)).toBe(true);
});

const errorMessage = (code: string): ChatMessage => ({
  id: "e",
  role: "assistant",
  parts: [
    {
      type: "data-event",
      data: {
        request_id: "r",
        seq: 1,
        t_ms: 0,
        event: { type: "error", code, message: "" },
      },
    },
  ],
});

it("finds the error code a blocked answer carries", () => {
  expect(messageError(errorMessage("rate_limited"))).toBe("rate_limited");
  expect(messageError(message("assistant", "hi"))).toBeUndefined();
});

it("accepts only stored chats it can render", () => {
  expect(isChatMessages([message("user", "q")])).toBe(true);
  expect(isChatMessages([])).toBe(true);
  expect(isChatMessages([{ id: "x", role: "system", parts: [] }])).toBe(false);
  expect(isChatMessages([{ id: 1 }])).toBe(false);
  expect(isChatMessages("nope")).toBe(false);
});
