import type { PastMessage } from "#/types/chat.types";

/** One line of the pre-dive check: what is true, and the value that proves it. */
export interface PreDiveCheck {
  name: string;
  value: string;
}

/** What the pre-dive check is about to send, or replay. */
export interface PreDivePlan {
  question: string;
  replay: boolean;
  dive: number;
  prior: PastMessage[];
}

/** `{n}` is a count or the dive number, `{s}` seconds, `{t}` a time, `{q}` the question. */
export interface PreDiveCopy {
  eyebrow: string;
  replayTag: string;
  title: { first: string; again: string; replay: string };
  checksLabel: string;
  checks: {
    packed: [string, string];
    carried: [string, string];
    fresh: [string, string];
    unstored: [string, string];
    paced: [string, string];
    recording: [string, string];
    timings: [string, string];
  };
  read: { checks: string; countdown: string };
  cargo: { summary: string; you: string; agent: string; wire: string };
  cancel: string;
  descend: string;
  say: { start: string; ready: string };
}
