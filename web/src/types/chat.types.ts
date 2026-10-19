import type { UIMessage } from "ai";
import type { StreamEvent } from "#/generated/events.gen";

export type ChatMessage = UIMessage<never, { event: StreamEvent }>;

export interface PastMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatRequestBody {
  question: string;
  history: PastMessage[];
  session: string;
}
