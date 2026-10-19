import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import {
  CHAT_MOVE_MS,
  EASE_IN_OUT,
  REDUCED_MOTION_QUERY,
} from "#/constants/motion.constants";

function pagePosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
}

/**
 * When `layoutKey` changes, glides the element from where it was to where
 * the new layout puts it (FLIP), so it never jumps.
 */
export function useFlip(
  ref: RefObject<HTMLElement | null>,
  layoutKey: unknown,
): void {
  const last = useRef<{ x: number; y: number } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on purpose only when the layout changes
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const before = last.current;
    const after = pagePosition(element);
    last.current = after;
    if (!before || matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const dx = before.x - after.x;
    const dy = before.y - after.y;
    if (!dx && !dy) return;
    element.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: CHAT_MOVE_MS, easing: EASE_IN_OUT },
    );
  }, [layoutKey]);

  useEffect(() => {
    const remember = () => {
      if (ref.current) last.current = pagePosition(ref.current);
    };
    addEventListener("resize", remember);
    return () => removeEventListener("resize", remember);
  }, [ref]);
}
