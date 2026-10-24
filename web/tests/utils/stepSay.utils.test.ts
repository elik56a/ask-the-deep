import { describe, expect, it } from "vitest";
import { DIVE_COPY } from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { StepContext } from "#/types/sea.types";
import { diveSteps } from "#/utils/depth.utils";
import { sayParts, stepSay } from "#/utils/stepSay.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const copy = DIVE_COPY.en.say;
const ctx: StepContext = {
  question: "Where does he work?",
  carried: 0,
  skipped: false,
  wallMs: 0,
  retrieved: [],
};
const say = (
  events: StreamEvent["event"][],
  extra: Partial<StepContext> = {},
) => {
  const step = diveSteps(stream(events)).at(-1);
  if (!step) throw new Error("no step");
  return stepSay(step, copy, { ...ctx, ...extra });
};

it("quotes the search query", () => {
  const said = say([EVENT_SAMPLES["tool.called"]]);
  expect(said?.text).toContain("{q}");
  expect(said?.quote).toBe(EVENT_SAMPLES["tool.called"].args.query);
});

it("tells a follow-up apart", () => {
  expect(say([EVENT_SAMPLES["request.started"]], { carried: 2 })?.text).toBe(
    copy.requestCarried,
  );
});

it("says what the model chose once its call completes", () => {
  const said = say([
    EVENT_SAMPLES["llm.started"],
    EVENT_SAMPLES["llm.completed"],
  ]);
  expect(said?.text).toContain("It can't answer from memory");
});

it("says how much slower the dive played than the server ran", () => {
  const finished: StreamEvent = {
    request_id: "r",
    seq: 0,
    t_ms: 3000,
    event: EVENT_SAMPLES["request.finished"],
  };
  const [step] = diveSteps([finished]);
  expect(stepSay(step, copy, { ...ctx, wallMs: 30_000 })?.text).toContain(
    "about 10× slower",
  );
  expect(stepSay(step, copy, { ...ctx, skipped: true })?.text).toBe(
    "You skipped ahead. The server finished in 3.00 s.",
  );
});

describe("sayParts", () => {
  it("streams plain narration from the start word", () => {
    expect(sayParts({ text: "Two words" }, 5)).toEqual([
      { text: "Two words", start: 5, quote: false },
    ]);
  });

  it("sets the quote apart at {q} and streams on after it", () => {
    expect(
      sayParts({ text: "Searching for {q} now.", quote: "rag eval" }, 0),
    ).toEqual([
      { text: "Searching for ", start: 0, quote: false },
      { text: "rag eval", start: 2, quote: true },
      { text: " now.", start: 4, quote: false },
    ]);
  });
});

describe("search narration", () => {
  const searching = (query: string) =>
    [{ ...EVENT_SAMPLES["tool.called"], args: { query } }] as const;

  it("reads the first search as the question itself, even on a follow-up", () => {
    const said = say([...searching(ctx.question)], { carried: 2 });
    expect(said?.text).toBe(copy.search);
  });

  it("reads a later search as the model's own, rewritten from a follow-up", () => {
    expect(say([...searching("work at Phytech")], { carried: 2 })?.text).toBe(
      copy.searchCarried,
    );
    expect(say([...searching("work at Phytech")])?.text).toBe(copy.searchMore);
  });
});
