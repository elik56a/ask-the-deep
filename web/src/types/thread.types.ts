import type { Citation } from "#/generated/events.gen";
import type { ChatMessage } from "#/types/chat.types";
import type { Trace } from "#/types/trace.types";

/** One question and its answer, numbered by the dive that carried it. */
export interface ThreadTurn {
  dive: number;
  question: ChatMessage;
  answer: ChatMessage | null;
}

/** What a turn's answer shows: its text, error, sources and the run behind it. */
export interface TurnView {
  trace: Trace;
  text: string;
  error: string | undefined;
  citations: Citation[];
  /** The run has reported how it ended. */
  done: boolean;
}
