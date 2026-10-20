export type ModelId = "diver" | "sardines" | "fish" | "jelly" | "angler";

export interface ModelCredit {
  id: ModelId;
  title: string;
  author: string;
  source: string;
}
