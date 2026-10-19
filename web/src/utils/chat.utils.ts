import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
} from "#/constants/chat.constants";
import type { StreamEvent } from "#/generated/events.gen";
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
