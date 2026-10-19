import type { GearDef, PlacedGear, SpokeWindow } from "#/types/movement.types";

export function gearRadii(teeth: number, module: number) {
  const pitch = (module * teeth) / 2;
  return { pitch, tip: pitch + module, root: pitch - 1.25 * module };
}

/** Outline of a toothed wheel as polar points: five per tooth, tooth 0 centred on angle 0. */
export function toothOutline(
  teeth: number,
  module: number,
): [number, number][] {
  const { tip, root } = gearRadii(teeth, module);
  const step = (Math.PI * 2) / teeth;
  const profile: [number, number][] = [
    [root, -0.5],
    [root, -0.27],
    [tip, -0.13],
    [tip, 0.13],
    [root, 0.27],
  ];
  return Array.from({ length: teeth }, (_, i) =>
    profile.map(([radius, at]): [number, number] => {
      const angle = (i + at) * step;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    }),
  ).flat();
}

/** Cut-outs between spokes, so the wheel reads as a skeleton movement. */
export function spokeWindows(
  teeth: number,
  module: number,
  spokes: number,
): SpokeWindow[] {
  const { pitch, root } = gearRadii(teeth, module);
  const hub = Math.max(0.3, pitch * 0.2);
  const rim = root - Math.max(0.16, pitch * 0.12);
  if (rim - hub <= 0.25) return [];
  const spoke = 0.09;
  return Array.from({ length: spokes }, (_, k) => ({
    hub,
    rim,
    from: (k / spokes) * Math.PI * 2,
    to: ((k + 1) / spokes) * Math.PI * 2,
    hubGap: spoke / hub,
    rimGap: spoke / rim,
  }));
}

/** Places each wheel at its own position or touching its parent at angle `theta`. */
export function placeTrain(defs: GearDef[], module: number): PlacedGear[] {
  const placed: PlacedGear[] = [];
  for (const def of defs) {
    const radius = gearRadii(def.teeth, module).pitch;
    const parent = placed.find((gear) => gear.stage === def.parent);
    const theta = def.theta ?? 0;
    const [x, y] = parent
      ? [
          parent.x + (parent.radius + radius) * Math.cos(theta),
          parent.y + (parent.radius + radius) * Math.sin(theta),
        ]
      : (def.at ?? [0, 0]);
    placed.push({ ...def, radius, x, y });
  }
  return placed;
}

/**
 * Angle of a driven wheel: it turns the other way at the tooth ratio, phased
 * so that a gap meets the driver's tooth at the contact point `theta`.
 */
export function meshedAngle(
  parentAngle: number,
  parentTeeth: number,
  teeth: number,
  theta: number,
): number {
  return (
    theta +
    Math.PI -
    Math.PI / teeth -
    (parentTeeth / teeth) * (parentAngle - theta)
  );
}
