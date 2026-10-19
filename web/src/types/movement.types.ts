import type { StageId } from "#/types/trace.types";

export interface GearDef {
  stage: StageId;
  teeth: number;
  spokes: number;
  at?: [number, number];
  parent?: StageId;
  theta?: number;
}

export interface PlacedGear extends GearDef {
  radius: number;
  x: number;
  y: number;
}

export interface SpokeWindow {
  hub: number;
  rim: number;
  from: number;
  to: number;
  hubGap: number;
  rimGap: number;
}
