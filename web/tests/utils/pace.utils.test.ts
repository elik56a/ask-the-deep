import { expect, it } from "vitest";
import { DWELL_MS } from "#/constants/pace.constants";
import type { PaceClock } from "#/types/pace.types";
import { advanceClock, paceTimes } from "#/utils/pace.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const RUN = stream([
  EVENT_SAMPLES["request.started"],
  EVENT_SAMPLES["guardrails.checked"],
  EVENT_SAMPLES["llm.started"],
  EVENT_SAMPLES["llm.completed"],
  EVENT_SAMPLES["generation.started"],
  { type: "text.delta", text: "One " },
  { type: "text.delta", text: "two " },
  { type: "text.delta", text: "three" },
  EVENT_SAMPLES["request.finished"],
]);

it("gives each step its dwell before the next one opens", () => {
  const times = paceTimes(RUN);
  expect(times[0]).toBe(0);
  expect(times[1]).toBe(DWELL_MS["request.started"]);
  expect(times[2]).toBe(times[1] + (DWELL_MS["guardrails.checked"] ?? 0));
});

it("lands an update inside the step it belongs to", () => {
  const times = paceTimes(RUN);
  expect(times[3]).toBeGreaterThan(times[2]);
  expect(times[3]).toBeLessThan(times[4]);
});

it("spreads the text across the writing step", () => {
  const times = paceTimes(RUN);
  const writing = DWELL_MS["generation.started"] ?? 0;
  expect(times[5]).toBeCloseTo(times[4] + writing * 0.12);
  expect(times[7]).toBeCloseTo(times[4] + writing * 0.92);
  expect(times[8]).toBe(times[4] + writing);
});

it("paces a whole dive at about half a minute or less", () => {
  expect(paceTimes(RUN).at(-1)).toBeLessThan(30_000);
});

it("never shows an event before it arrived, and keeps the order", () => {
  const slow = RUN.map((item, i) =>
    i === 2 ? { ...item, t_ms: 60_000 } : item,
  );
  const times = paceTimes(slow);
  expect(times[2]).toBe(60_000);
  for (let i = 1; i < times.length; i++) {
    expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
  }
});

it("never moves an event later when more of the stream arrives", () => {
  const full = paceTimes(RUN);
  for (let n = 1; n < RUN.length; n++) {
    paceTimes(RUN.slice(0, n)).forEach((at, i) => {
      expect(full[i]).toBeLessThanOrEqual(at);
    });
  }
});

const CLOCK: PaceClock = { v: 0, wall: 0, at: 1000, speed: 2, paused: false };

it("runs dive time at the chosen speed", () => {
  expect(advanceClock(CLOCK, 1500)).toMatchObject({ v: 1000, wall: 500 });
});

it("holds dive time while paused, but real time runs on", () => {
  expect(advanceClock({ ...CLOCK, paused: true }, 1500)).toMatchObject({
    v: 0,
    wall: 500,
  });
});
