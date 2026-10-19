import { expect, it } from "vitest";
import { GEAR_MODULE, GEAR_TRAIN } from "#/constants/movement.constants";
import {
  gearRadii,
  meshedAngle,
  placeTrain,
  spokeWindows,
  toothOutline,
} from "#/utils/gear.utils";

it("sizes a wheel from its tooth count", () => {
  const { pitch, tip, root } = gearRadii(44, 0.13);

  expect(pitch).toBeCloseTo(2.86);
  expect(tip).toBeCloseTo(2.99);
  expect(root).toBeCloseTo(2.6975);
});

it("draws five points per tooth between root and tip", () => {
  const { tip, root } = gearRadii(16, 0.13);
  const points = toothOutline(16, 0.13);

  expect(points).toHaveLength(80);
  for (const [x, y] of points) {
    const radius = Math.hypot(x, y);
    expect(radius).toBeGreaterThanOrEqual(root - 1e-9);
    expect(radius).toBeLessThanOrEqual(tip + 1e-9);
  }
});

it("places every driven wheel touching its parent at the pitch circle", () => {
  const train = placeTrain(GEAR_TRAIN, GEAR_MODULE);

  for (const gear of train.filter((item) => item.parent)) {
    const parent = train.find((item) => item.stage === gear.parent);
    if (!parent) throw new Error(`no parent for ${gear.stage}`);
    expect(Math.hypot(gear.x - parent.x, gear.y - parent.y)).toBeCloseTo(
      gear.radius + parent.radius,
    );
  }
});

it("turns a driven wheel the other way at the tooth ratio", () => {
  const before = meshedAngle(0, 44, 20, 0.35);
  const after = meshedAngle(0.1, 44, 20, 0.35);

  expect(after - before).toBeCloseTo(-0.1 * (44 / 20));
});

it("meets the driver's tooth with a gap at the contact point", () => {
  const teeth = 20;
  const theta = 0.35;
  // The driver's tooth 0 sits at the contact angle when its angle equals theta.
  const driven = meshedAngle(theta, 44, teeth, theta);
  const gapAtContact = driven + Math.PI / teeth - (theta + Math.PI);
  const pitch = (Math.PI * 2) / teeth;

  expect(Math.abs(gapAtContact % pitch)).toBeCloseTo(0);
});

it("cuts spoke windows only where the wheel is big enough", () => {
  expect(spokeWindows(44, 0.13, 5)).toHaveLength(5);
  expect(spokeWindows(6, 0.13, 3)).toEqual([]);
});
