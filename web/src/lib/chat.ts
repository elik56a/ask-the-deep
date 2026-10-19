import type { UIMessage } from "ai";
import type { StreamEvent } from "#/lib/events.gen";

export type ChatMessage = UIMessage<never, { event: StreamEvent }>;

export function messageEvents(message: ChatMessage): StreamEvent[] {
  return message.parts.flatMap((part) =>
    part.type === "data-event" ? [part.data] : [],
  );
}

export function messageText(message: ChatMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
