import type { ChatMessage } from "#/types/chat.types";

/** One question and its answer, numbered by the dive that carried it. */
export interface ThreadTurn {
  dive: number;
  question: ChatMessage;
  answer: ChatMessage | null;
}
