export type ModelId =
  | "diver"
  | "sardines"
  | "fish"
  | "jelly"
  | "boat"
  | "turtle"
  | "dolphin"
  | "manta"
  | "shark"
  | "hammerheads"
  | "humpback"
  | "research-sub"
  | "glass-octopus"
  | "angler2"
  | "alien-fish"
  | "whale-fall"
  | "helmet"
  | "isopod"
  | "star"
  | "star-cushion"
  | "coral-stylaster"
  | "coral-soft"
  | "seahorse"
  | "seadragon";

export interface ModelCreditsCopy {
  summary: string;
  by: string;
  /** Before the licence link, after it. */
  license: [string, string];
}

export interface ModelCredit {
  id: ModelId;
  title: string;
  author: string;
  source: string;
  /** Public domain; every other model is CC BY 4.0. */
  cc0?: boolean;
}
