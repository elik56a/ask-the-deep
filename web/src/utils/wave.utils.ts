import type { Swell, Wave } from "#/types/wave.types";

const unit = ([x, z, f, a, s]: Wave): Wave => {
  const l = Math.hypot(x, z);
  return [x / l, z / l, f, a, s];
};

/** The swell at (x, z) and time t, the same sum of sines the ocean shader draws. */
export function waveAt(waves: Wave[], x: number, z: number, t: number): Swell {
  let h = 0;
  let dx = 0;
  let dz = 0;
  for (const wave of waves) {
    const [ux, uz, f, a, s] = unit(wave);
    const ph = (ux * x + uz * z) * f + t * s;
    h += a * Math.sin(ph);
    const c = a * f * Math.cos(ph);
    dx += c * ux;
    dz += c * uz;
  }
  return { h, dx, dz };
}

/** The waves as GLSL calls to the ocean shader's `W(dir, freq, amp, speed)`. */
export function waveGlsl(waves: Wave[]): string {
  return waves
    .map(unit)
    .map(
      ([x, z, f, a, s]) =>
        `W(vec2(${x.toFixed(4)}, ${z.toFixed(4)}), ${f.toFixed(3)}, ${a.toFixed(3)}, ${s.toFixed(3)});`,
    )
    .join(" ");
}
