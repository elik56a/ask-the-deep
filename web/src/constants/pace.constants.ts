import type { StreamEvent } from "#/generated/events.gen";

type EventType = StreamEvent["event"]["type"];

// How long each step holds the screen, by the event that opens it (ADR 0019: about 30 s per dive).
export const DWELL_MS: Partial<Record<EventType, number>> = {
  "request.started": 2600,
  "guardrails.checked": 2800,
  "cache.checked": 2800,
  "llm.started": 3800,
  "tool.called": 2800,
  "retrieval.completed": 5200,
  "generation.started": 4200,
  "decision.made": 3000,
  "citations.attached": 2600,
  "request.finished": 0,
  error: 0,
};

// Where inside the current step's dwell an event that only updates it lands (0 = its start, 1 = its end).
export const INSIDE: Partial<Record<EventType, number>> = {
  "llm.completed": 0.55,
  "retrieval.started": 0.2,
  "tool.completed": 0.1,
  "usage.reported": 0.4,
};

// Text deltas spread across this part of the writing step.
export const DELTA_FROM = 0.12;
export const DELTA_SPAN = 0.8;

export const PACE_TICK_MS = 100;

export const SPEEDS = [1, 2] as const;
