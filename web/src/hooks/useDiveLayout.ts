import { type RefObject, useLayoutEffect, useState } from "react";
import type { StepKind } from "#/types/sea.types";
import { placeSteps } from "#/utils/depth.utils";

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Places each child of `listRef` at its depth, re-measuring as the cards grow. */
export function useDiveLayout(
  listRef: RefObject<HTMLElement | null>,
  kinds: StepKind[],
) {
  const [heights, setHeights] = useState<number[]>([]);
  const count = kinds.length;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || count === 0) return;
    const items = [...list.children].filter(
      (child) => child instanceof HTMLElement,
    );
    const measure = () => {
      const next = items.map((item) => item.offsetHeight);
      setHeights((previous) => (same(previous, next) ? previous : next));
    };
    const observer = new ResizeObserver(measure);
    for (const item of items) observer.observe(item);
    measure();
    return () => observer.disconnect();
  }, [listRef, count]);

  const tops = placeSteps(
    kinds.map((kind, i) => ({ kind, height: heights[i] ?? 0 })),
  );
  const last = tops.length - 1;
  const bottom = last < 0 ? 0 : tops[last] + (heights[last] ?? 0);
  return { tops, bottom };
}
