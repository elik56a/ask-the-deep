import { expect, it } from "vitest";
import { streamTokens } from "#/utils/streamWords.utils";

it("numbers the words and keeps the spaces", () => {
  expect(streamTokens("Checked  your question")).toEqual([
    { text: "Checked", index: 0 },
    { text: "  ", index: null },
    { text: "your", index: 1 },
    { text: " ", index: null },
    { text: "question", index: 2 },
  ]);
});

it("keeps counting from where the line before stopped", () => {
  expect(streamTokens("next line", 3).map((token) => token.index)).toEqual([
    3,
    null,
    4,
  ]);
});

it("streams Hebrew word by word too", () => {
  expect(
    streamTokens("השאלה נבדקה").filter((token) => token.index !== null),
  ).toHaveLength(2);
});

it("gives empty text no words", () => {
  expect(streamTokens("")).toEqual([]);
});
