import { expect, it } from "vitest";
import { SAND_RIPPLES } from "#/constants/seaScene.constants";
import { sandHeight } from "#/utils/seabed.utils";

it("sums the ripples", () => {
  const atOrigin = SAND_RIPPLES.reduce(
    (h, [, , amp, phase]) => h + amp * Math.sin(phase),
    0,
  );
  expect(sandHeight(0, 0)).toBeCloseTo(atOrigin);
});
