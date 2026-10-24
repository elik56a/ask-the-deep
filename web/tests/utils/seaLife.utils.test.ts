import { describe, expect, it } from "vitest";
import type { BedProp, Place } from "#/types/seaScene.types";
import { bedSlots, members } from "#/utils/seaLife.utils";

const place = (x: number): Place => ({ x, y: 0, z: 0, ry: 0 });

describe("members", () => {
  it("lists each member of each group, one when no count is given", () => {
    const groups = [{ id: "a", count: 2 }, { id: "b" }];
    expect(members(groups).map(({ group, i }) => `${group.id}${i}`)).toEqual([
      "a0",
      "a1",
      "b0",
    ]);
  });
});

describe("bedSlots", () => {
  it("sets each prop at every place, count times at each", () => {
    const prop: BedProp = {
      model: "whale-fall",
      length: 1,
      count: 2,
      places: [place(1), place(2)],
    };
    expect(bedSlots([prop]).map(({ place, i }) => [place.x, i])).toEqual([
      [1, 0],
      [1, 1],
      [2, 0],
      [2, 1],
    ]);
  });
});
