import { describe, expect, it } from "vitest";
import {
  ASCEND_SPEED,
  ASCENT_MIN_SPEED,
  ASCENT_SLOW_GAIN,
  ASCENT_SLOW_PX,
  DIVER_LINE,
  FOLLOW_GAIN,
  RESYNC_PX,
  RUSH_SPEED,
} from "#/constants/sea.constants";
import {
  ascentGlide,
  diverLineY,
  followGlide,
  glideStep,
  keyDirection,
  scrollIntent,
} from "#/utils/scroll.utils";

const glide = { to: 1000, speed: 100, gain: 2, minSpeed: 0 };

describe("glideStep", () => {
  it("moves in proportion to the gap, capped by the speed", () => {
    expect(glideStep(0, { ...glide, speed: 1e6 }, 0.1, false)).toBeCloseTo(200);
    expect(glideStep(0, glide, 0.1, false)).toBeCloseTo(10);
  });

  it("never overshoots, and moves at least the minimum speed", () => {
    expect(glideStep(995, { ...glide, minSpeed: 1e4 }, 0.1, false)).toBe(1000);
    expect(glideStep(900, { ...glide, minSpeed: 500 }, 0.1, false)).toBeCloseTo(
      950,
    );
  });

  it("glides up as well as down", () => {
    expect(glideStep(2000, { ...glide, speed: 1e6 }, 0.1, false)).toBeCloseTo(
      1800,
    );
  });

  it("jumps straight there on a snap, and stays put once there", () => {
    expect(glideStep(0, glide, 0.016, true)).toBe(1000);
    expect(glideStep(999.8, glide, 0.016, true)).toBe(999.8);
  });
});

it("puts a step at the diver line", () => {
  expect(diverLineY(500, 300, 1000)).toBe(800 - 1000 * DIVER_LINE);
});

it("rushes faster than it follows", () => {
  expect(followGlide(10, true).speed).toBe(RUSH_SPEED);
  expect(followGlide(10, false).gain).toBe(FOLLOW_GAIN);
});

it("slows the ascent near the surface without dropping below its floor", () => {
  expect(ascentGlide(ASCENT_SLOW_PX + 1)).toEqual({
    to: 0,
    speed: ASCEND_SPEED,
    gain: FOLLOW_GAIN,
    minSpeed: ASCENT_MIN_SPEED,
  });
  expect(ascentGlide(ASCENT_SLOW_PX - 1).gain).toBe(ASCENT_SLOW_GAIN);
});

describe("scrollIntent", () => {
  it("pauses on any scroll at the seabed and on scrolling up in the dive", () => {
    expect(scrollIntent("reveal", "down", 0, null)).toBe("pause");
    expect(scrollIntent("dive", "up", 0, 500)).toBe("pause");
  });

  it("holds at the latest step when scrolling down to it in the dive", () => {
    expect(scrollIntent("dive", "down", 500 - RESYNC_PX, 500)).toBe("hold");
    expect(scrollIntent("dive", "down", 500 - RESYNC_PX - 1, 500)).toBe("pass");
    expect(scrollIntent("dive", "down", 900, null)).toBe("pass");
  });
});

it("reads the scroll keys, with Shift turning space up and the rest off", () => {
  expect(keyDirection(" ", false)).toBe("down");
  expect(keyDirection(" ", true)).toBe("up");
  expect(keyDirection("PageDown", false)).toBe("down");
  expect(keyDirection("PageDown", true)).toBeNull();
  expect(keyDirection("Home", true)).toBe("up");
  expect(keyDirection("a", false)).toBeNull();
});
