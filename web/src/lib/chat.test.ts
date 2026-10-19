import { readFileSync } from "node:fs";
import {
  parseJsonEventStream,
  readUIMessageStream,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from "ai";
import { expect, it } from "vitest";
import { type ChatMessage, messageEvents, messageText } from "#/lib/chat";

const capturedStream = readFileSync(
  new URL("./fixtures/chat-stream.sse", import.meta.url),
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
  const message = await readWithTheAiSdk(capturedStream);
  expect(messageText(message)).toContain("offline test model");
  const types = messageEvents(message).map((e) => e.event.type);
  expect(types[0]).toBe("request.started");
  expect(types).toContain("llm.completed");
  expect(types).toContain("tool.called");
  expect(types.at(-1)).toBe("request.finished");
});
