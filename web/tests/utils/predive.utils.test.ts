import { expect, it } from "vitest";
import {
  HELM_NOTCH,
  PACE_ESTIMATE_MS,
  PREDIVE_COPY,
} from "#/constants/predive.constants";
import type { PreDivePlan } from "#/types/predive.types";
import { formatMs } from "#/utils/format.utils";
import { paceTimes } from "#/utils/pace.utils";
import {
  cargoRows,
  helmTurn,
  preDiveChecks,
  veilProgress,
  veilTitle,
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

const veil: PreDivePlan = { question: "Q?", replay: false, dive: 2, prior: [] };

it("titles the veil for a first dive, a follow-up and a replay", () => {
  const { title } = PREDIVE_COPY.en;
  expect(veilTitle(title, veil)).toBe(title.first);
  expect(
    veilTitle(title, { ...veil, prior: [{ role: "user", text: "a" }] }),
  ).toBe(title.again);
  expect(veilTitle(title, { ...veil, replay: true })).toContain("2");
});

it("fills the ring with the checks, then empties it over the countdown", () => {
  expect(veilProgress(2, 0, 4, 3)).toBe(0.5);
  expect(veilProgress(4, 1, 4, 3)).toBeCloseTo(2 / 3);
  expect(veilProgress(4, 3, 4, 3)).toBe(0);
});

it("turns the helm a notch per check, back over the countdown, and spins on Descend", () => {
  expect(helmTurn(4, 0, 4, 3, false)).toBe(4 * HELM_NOTCH);
  expect(helmTurn(4, 3, 4, 3, false)).toBeCloseTo(0);
  expect(helmTurn(0, 0, 4, 3, true)).toBe(2 * Math.PI);
});

it("carries the earlier messages, then the new question", () => {
  const prior = [{ role: "assistant" as const, text: "a" }];
  expect(cargoRows({ ...veil, prior })).toEqual([
    ...prior,
    { role: "user", text: "Q?" },
  ]);
});
