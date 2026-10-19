import type { ChatStatus } from "ai";
import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
} from "#/constants/chat.constants";
import type { Citation, StreamEvent } from "#/generated/events.gen";
import type {
  ChatMessage,
  ChatRequestBody,
  PastMessage,
} from "#/types/chat.types";

export function messageEvents(message: ChatMessage): StreamEvent[] {
  return message.parts.flatMap((part) =>
    part.type === "data-event" ? [part.data] : [],
  );
}

export function messageCitations(events: StreamEvent[]): Citation[] {
  return events.flatMap(({ event }) =>
    event.type === "citations.attached" ? event.citations : [],
  );
}

export function latestAnswer(messages: ChatMessage[]): ChatMessage | undefined {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
}

export function messageText(message: ChatMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export function chatRequestBody(
  messages: ChatMessage[],
  session: string,
): ChatRequestBody {
  const last = messages.at(-1);
  const history = messages
    .slice(0, -1)
    .flatMap((message): PastMessage[] => {
      const text = messageText(message).slice(0, MAX_HISTORY_CHARS);
      return message.role !== "system" && text
        ? [{ role: message.role, text }]
        : [];
    })
    .slice(-MAX_HISTORY_MESSAGES);
  return { question: last ? messageText(last) : "", history, session };
}

export function messageError(message: ChatMessage): string | undefined {
  for (const { event } of messageEvents(message)) {
    if (event.type === "error") return event.code;
  }
  return undefined;
}

export function isWaiting(
  messages: ChatMessage[],
  status: ChatStatus,
): boolean {
  if (status === "submitted") return true;
  const last = messages.at(-1);
  return (
    status === "streaming" &&
    last?.role === "assistant" &&
    !messageText(last) &&
    !messageError(last)
  );
}

export function isChatMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "role" in item &&
        (item.role === "user" || item.role === "assistant") &&
        "parts" in item &&
        Array.isArray(item.parts),
    )
  );
}
