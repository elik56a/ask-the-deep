import { describe, expect, it } from "vitest";
import type { Wave } from "#/types/wave.types";
import { waveAt, waveGlsl } from "#/utils/wave.utils";

const WAVES: Wave[] = [
  [3, 4, 1, 2, 0],
  [0, 1, 0.5, 1, 1],
];

describe("waveAt", () => {
  it("is flat at the origin at time zero", () => {
    expect(waveAt(WAVES, 0, 0, 0)).toEqual({
      h: 0,
      dx: 2 * 0.6 + 0,
      dz: 2 * 0.8 + 0.5,
    });
  });

  it("normalises the direction before the phase", () => {
    const { h } = waveAt([[3, 4, 1, 1, 0]], 3, 4, 0);
    expect(h).toBeCloseTo(Math.sin(5));
  });
});

describe("waveGlsl", () => {
  it("writes one call per wave with a unit direction", () => {
    expect(waveGlsl(WAVES)).toBe(
      "W(vec2(0.6000, 0.8000), 1.000, 2.000, 0.000); W(vec2(0.0000, 1.0000), 0.500, 1.000, 1.000);",
    );
  });
});
