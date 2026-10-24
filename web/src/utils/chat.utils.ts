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

/** The earlier messages that travel with a question, as the API receives them. */
export function pastMessages(messages: ChatMessage[]): PastMessage[] {
  return messages
    .flatMap((message): PastMessage[] => {
      const text = messageText(message).slice(0, MAX_HISTORY_CHARS);
      return message.role !== "system" && text
        ? [{ role: message.role, text }]
        : [];
    })
    .slice(-MAX_HISTORY_MESSAGES);
}

// The model cites passages inline, as "[file.md#heading]" or several comma-separated in one bracket.
const CITATION_MARKS =
  /\s*\[[^\]\s,]+\.md#[^\]\s,]+(?:,\s*[^\]\s,]+\.md#[^\]\s,]+)*\]/g;

/** The answer as the visitor reads it: the sources show as links under it, so the inline marks go. */
export function answerText(message: ChatMessage): string {
  return messageText(message).replace(CITATION_MARKS, "");
}

export function chatRequestBody(
  messages: ChatMessage[],
  session: string,
): ChatRequestBody {
  const last = messages.at(-1);
  const history = pastMessages(messages.slice(0, -1));
  return { question: last ? messageText(last) : "", history, session };
}

export function messageError(message: ChatMessage): string | undefined {
  for (const { event } of messageEvents(message)) {
    if (event.type === "error") return event.code;
  }
  return undefined;
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

/** How many earlier messages went with `question`, as `pastMessages` sent them. */
export function carriedWith(
  messages: ChatMessage[],
  question: ChatMessage,
): number {
  const at = messages.indexOf(question);
  return at > 0 ? pastMessages(messages.slice(0, at)).length : 0;
}
