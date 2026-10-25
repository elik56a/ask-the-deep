import { expect, it } from "vitest";
import {
  COUNT_MS,
  FIRST_TICK_MS,
  HOLD_MS,
  PACE_ESTIMATE_MS,
  PREDIVE_COPY,
  TICK_MS,
} from "#/constants/predive.constants";
import type { PreDivePlan } from "#/types/predive.types";
import { formatMs } from "#/utils/format.utils";
import { paceTimes } from "#/utils/pace.utils";
import {
  cargoRows,
  preDiveBeats,
  preDiveChecks,
  slateTitle,
} from "#/utils/predive.utils";
import { EVENT_SAMPLES, stream } from "../fixtures/eventSamples";

const COPY = PREDIVE_COPY.en;
const RUN = stream([
  EVENT_SAMPLES["request.started"],
  EVENT_SAMPLES["guardrails.checked"],
  EVENT_SAMPLES["llm.started"],
  EVENT_SAMPLES["request.finished"],
]);
const plan = (over: Partial<PreDivePlan>): PreDivePlan => ({
  question: "Where does he work?",
  replay: false,
  dive: 1,
  prior: [],
  ...over,
});

it("checks a first question in four lines, with the estimated pace", () => {
  const checks = preDiveChecks(COPY, plan({}), []);
  expect(checks.map((check) => check.name)).toEqual([
    "Question packed",
    "Fresh conversation",
    "Nothing stored",
    "Paced for you",
  ]);
  expect(checks[0].value).toBe("19 characters");
  expect(checks[3].value).toBe(
    `≈ ${PACE_ESTIMATE_MS / 1000} s · pause or skip`,
  );
});

it("counts the earlier messages a follow-up carries", () => {
  const prior = [
    { role: "user" as const, text: "Hi" },
    { role: "assistant" as const, text: "Hello" },
  ];
  const checks = preDiveChecks(COPY, plan({ prior }), []);
  expect(checks[1]).toEqual({
    name: "Conversation on board",
    value: "2 earlier + 1 new",
  });
});

it("checks a replay in three lines from the recording itself", () => {
  const checks = preDiveChecks(COPY, plan({ replay: true }), RUN);
  const paced = Math.round((paceTimes(RUN).at(-1) ?? 0) / 1000);
  expect(checks).toEqual([
    {
      name: "Recording found",
      value: `${RUN.length} events, kept in this tab`,
    },
    {
      name: "Real server timings",
      value: `${formatMs(RUN.at(-1)?.t_ms ?? 0)} on the server`,
    },
    { name: "Paced for you", value: `≈ ${paced} s · pause or skip` },
  ]);
});

const slate: PreDivePlan = {
  question: "Q?",
  replay: false,
  dive: 2,
  prior: [],
};

it("titles the slate for a first dive, a follow-up and a replay", () => {
  const { title } = PREDIVE_COPY.en;
  expect(slateTitle(title, slate)).toBe(title.first);
  expect(
    slateTitle(title, { ...slate, prior: [{ role: "user", text: "a" }] }),
  ).toBe(title.again);
  expect(slateTitle(title, { ...slate, replay: true })).toContain("2");
});

it("carries the earlier messages, then the new question", () => {
  const prior = [{ role: "assistant" as const, text: "a" }];
  expect(cargoRows({ ...slate, prior })).toEqual([
    ...prior,
    { role: "user", text: "Q?" },
  ]);
});

it("ticks each check, counts down, then leaves once", () => {
  const beats = preDiveBeats(2, 3);
  expect(beats.map(({ ticks, step, leave }) => [ticks, step, leave])).toEqual([
    [1, 0, false],
    [2, 0, false],
    [2, 1, false],
    [2, 2, false],
    [2, 3, false],
    [2, 3, true],
  ]);
  const ready = FIRST_TICK_MS + 2 * TICK_MS + HOLD_MS;
  expect(beats.map((beat) => beat.at)).toEqual([
    FIRST_TICK_MS,
    FIRST_TICK_MS + TICK_MS,
    ready,
    ready + COUNT_MS,
    ready + 2 * COUNT_MS,
    ready + 3 * COUNT_MS,
  ]);
});

it("leaves straight after the hold when there is nothing to count", () => {
  expect(preDiveBeats(0, 0)).toEqual([
    { at: FIRST_TICK_MS + HOLD_MS, ticks: 0, step: 0, leave: true },
  ]);
});
