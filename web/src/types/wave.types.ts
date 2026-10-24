/** One swell component: direction (x, z), frequency, amplitude and speed. */
export type Wave = [
  x: number,
  z: number,
  freq: number,
  amp: number,
  speed: number,
];

/** Height of the swell at a point, with its slope along x and z. */
export interface Swell {
  h: number;
  dx: number;
  dz: number;
}
