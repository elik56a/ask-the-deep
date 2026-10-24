import { type RefObject, useLayoutEffect, useRef } from "react";
import {
  EASE_OUT,
  REDUCED_MOTION_QUERY,
  RELAYOUT_MS,
} from "#/constants/motion.constants";

/**
 * When the list re-lays out, each item jumps to its new top and slides there on transform (FLIP),
 * so nothing animates layout. `keys` name the items in order; nothing moves until `measured`.
 */
export function useRelayout(
  listRef: RefObject<HTMLElement | null>,
  keys: number[],
  tops: number[],
  measured: boolean,
): void {
  const placed = useRef(new Map<number, number>());
  const slides = useRef(new Map<number, Animation>());

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !measured) return;
    const flip = !matchMedia(REDUCED_MOTION_QUERY).matches;
    keys.forEach((key, i) => {
      const top = tops[i];
      const was = placed.current.get(key);
      placed.current.set(key, top);
      const item = list.children[i];
      if (!flip || was === undefined || Math.abs(was - top) <= 1) return;
      if (!(item instanceof HTMLElement)) return;
      // A slide can be retargeted mid-way: it restarts from where the item is now.
      const moving = new DOMMatrix(getComputedStyle(item).transform).m42;
      slides.current.get(key)?.cancel();
      slides.current.set(
        key,
        item.animate(
          [
            { transform: `translateY(${was + moving - top}px)` },
            { transform: "none" },
          ],
          { duration: RELAYOUT_MS, easing: EASE_OUT },
        ),
      );
    });
  }, [listRef, keys, tops, measured]);
}
