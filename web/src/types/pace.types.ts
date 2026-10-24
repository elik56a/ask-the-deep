/** The paced dive's clock: `v` is the dive's own time, `wall` the real time since it started. */
export interface PaceClock {
  v: number;
  wall: number;
  at: number;
  speed: number;
  paused: boolean;
}
