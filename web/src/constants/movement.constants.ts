import type { GearDef } from "#/types/movement.types";
import type { StageId } from "#/types/trace.types";

export const STAGE_ORDER: StageId[] = ["guard", "llm", "tool", "stream"];

// One wheel per pipeline stage (P5.10); the model wheel drives the others.
export const GEAR_MODULE = 0.13;
export const GEAR_TRAIN: GearDef[] = [
  { stage: "llm", teeth: 44, spokes: 5, at: [-1.4, 0] },
  { stage: "tool", teeth: 20, spokes: 4, parent: "llm", theta: 0.35 },
  { stage: "stream", teeth: 15, spokes: 3, parent: "tool", theta: -1.05 },
  { stage: "guard", teeth: 16, spokes: 3, parent: "llm", theta: 2.55 },
];
export const BALANCE_AT: [number, number] = [-6.4, -1.4];
export const TRAIN_SHIFT_X = 2.2;

// Radians per second of the model wheel while a request runs.
export const RUN_SPEED = 0.7;
export const STAGE_KICK = 0.9;
export const BALANCE_SWING = 1.4;
export const BALANCE_HZ = 2.5;
export const GLOW_RISE = 10;
export const GLOW_FALL = 2.5;
export const MAX_PIXEL_RATIO = 2;
