import { describe, expect, it } from "vitest";
import { DIVE_START } from "#/constants/diveState.constants";
import type { DiveState } from "#/types/diveState.types";
import type { PreDivePlan } from "#/types/predive.types";
import type { DiveMode } from "#/types/sea.types";
import {
  consoleEntrance,
  diveReducer,
  isUnderwater,
} from "#/utils/diveState.utils";

const PLAN: PreDivePlan = {
  question: "Hi?",
  replay: false,
  dive: 3,
  prior: [],
};
const at = (over: Partial<DiveState>): DiveState => ({
  ...DIVE_START,
  ...over,
});

describe("diveReducer", () => {
  it("opens the buddy check on the newest dive and marks the chat as stepped aside", () => {
    const next = diveReducer(at({ watching: 1, fresh: 2 }), {
      type: "plan",
      plan: PLAN,
    });
    expect(next).toMatchObject({
      mode: "intro",
      plan: PLAN,
      watching: null,
      fresh: null,
      returned: true,
    });
  });

  it("watches the replayed dive", () => {
    const plan = { ...PLAN, replay: true, dive: 1 };
    expect(diveReducer(DIVE_START, { type: "plan", plan }).watching).toBe(1);
  });

  it("marks a question sent from the surface as fresh, on the newest dive", () => {
    expect(
      diveReducer(at({ watching: 1 }), { type: "sent", dive: 4 }),
    ).toMatchObject({ watching: null, fresh: 4 });
  });

  it("starts over at rest on a new conversation", () => {
    const next = diveReducer(at({ mode: "reveal", watching: 1, fresh: 2 }), {
      type: "clear",
    });
    expect(next).toMatchObject({ mode: "rest", watching: null, fresh: null });
  });

  it("drops the plan on cancel, and once the slate is gone without moving", () => {
    expect(
      diveReducer(at({ mode: "intro", plan: PLAN }), { type: "cancel" }),
    ).toMatchObject({ mode: "rest", plan: null });
    expect(
      diveReducer(at({ mode: "dive", plan: PLAN }), { type: "gone" }),
    ).toMatchObject({ mode: "dive", plan: null });
  });

  it("reveals with the full chat", () => {
    expect(
      diveReducer(at({ mode: "dive", chatState: "side" }), { type: "reveal" }),
    ).toMatchObject({ mode: "reveal", chatState: "full" });
  });

  it("folds only the full chat at the seabed", () => {
    expect(
      diveReducer(at({ mode: "reveal" }), { type: "fold" }).chatState,
    ).toBe("pill");
    expect(
      diveReducer(at({ mode: "reveal", chatState: "side" }), { type: "fold" })
        .chatState,
    ).toBe("side");
    const resting = at({ mode: "dive" });
    expect(diveReducer(resting, { type: "fold" })).toBe(resting);
  });
});

it("is underwater from the dive to the ascent", () => {
  expect(
    (["rest", "intro", "dive", "reveal", "ascend"] satisfies DiveMode[]).map(
      isUnderwater,
    ),
  ).toEqual([false, false, true, true, true]);
});

it("rises at the seabed, and surfaces only once the chat has stepped aside", () => {
  expect(consoleEntrance(at({ mode: "reveal" }))).toBe("console-rise");
  expect(consoleEntrance(at({ returned: true }))).toBe("console-surface");
  expect(consoleEntrance(DIVE_START)).toBe("");
});
