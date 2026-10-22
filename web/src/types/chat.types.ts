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

/** The chat at the seabed: full at the bottom centre, a pill while rereading, or a side panel opened from it. */
export type ChatState = "full" | "pill" | "side";

export interface ChatCopy {
  agentLabel: string;
  stayAtSurface: string;
  consoleTitle: string;
  answerLabel: string;
  stayHint: string;
  menu: string;
  reread: string;
  openChat: string;
  minimize: string;
  seabed: string;
  surface: string;
  /** Before the subject, the subject (set in bold), after it. */
  introTitle: [string, string, string];
  introBody: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  suggestionsLabel: string;
  suggestions: string[];
  thinking: string;
  threadLabel: string;
  agentAvatar: string;
  sourcesUsed: string;
  /** Before the bold dive number; then the stats, with `{t}`, `{calls}` and `{cost}`. */
  meta: { dive: string; stats: string };
  watchAgain: string;
  newConversation: string;
  pending: string;
  errors: Partial<Record<string, string>>;
  genericError: string;
}
