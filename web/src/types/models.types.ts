export type ModelId = "diver" | "sardines" | "fish" | "jelly" | "angler";

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
}
