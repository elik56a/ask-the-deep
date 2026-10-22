import { useLayoutEffect, useRef } from "react";
import {
  EASE_OUT,
  FOLD_FADE_FROM,
  FOLD_FADE_MS,
  FOLD_MS,
  REDUCED_MOTION_QUERY,
} from "#/constants/motion.constants";

function placeOf(title: HTMLElement, card: HTMLElement) {
  const t = title.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return {
    x: t.left - c.left,
    y: t.top - c.top,
    size: Number.parseFloat(getComputedStyle(title).fontSize),
  };
}

/**
 * The spotlight folds into the log: when `focus` ends, the big title shrinks into its small place
 * instead of snapping, and the card fades up. Returns the card and title refs.
 */
export function useFold(focus: boolean, title: string) {
  const card = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const placed = useRef<ReturnType<typeof placeOf> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new title remounts the heading, so its place is measured again
  useLayoutEffect(() => {
    const t = heading.current;
    const c = card.current;
    if (!t || !c) return;
    if (focus) {
      placed.current = placeOf(t, c);
      return;
    }
    const from = placed.current;
    placed.current = null;
    if (!from || matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const to = placeOf(t, c);
    t.animate(
      [
        {
          transformOrigin: "0 0",
          transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.size / to.size})`,
        },
        { transformOrigin: "0 0", transform: "none" },
      ],
      { duration: FOLD_MS, easing: EASE_OUT },
    );
    c.animate([{ opacity: FOLD_FADE_FROM }, { opacity: 1 }], {
      duration: FOLD_FADE_MS,
      easing: EASE_OUT,
    });
  }, [focus, title]);

  return { card, heading };
}
