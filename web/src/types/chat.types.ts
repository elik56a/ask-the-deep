import type { UIMessage } from "ai";
import type { StreamEvent } from "#/generated/events.gen";
import type { StepsCopy } from "#/types/chatSteps.types";

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

export interface ChatCopy {
  agentLabel: string;
  introTitle: string;
  introBody: string;
  steps: StepsCopy;
  inputLabel: string;
  placeholder: string;
  send: string;
  suggestionsLabel: string;
  suggestions: string[];
  thinking: string;
  errors: Partial<Record<string, string>>;
  genericError: string;
}
