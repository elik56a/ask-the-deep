import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  EASE_OUT,
  PANEL_ENTER_MS,
  PANEL_EXIT_MS,
  PANEL_SECTION_DELAY_MS,
  PANEL_SECTION_MS,
  PANEL_SECTION_STAGGER_MS,
  REDUCED_MOTION_QUERY,
  SIDE_BY_SIDE_QUERY,
} from "#/constants/motion.constants";

// The panel enters from the inline end beside the chat, from below when stacked.
function offset(distance: number): string {
  if (matchMedia(REDUCED_MOTION_QUERY).matches) return "none";
  if (!matchMedia(SIDE_BY_SIDE_QUERY).matches) {
    return `translateY(${distance * 0.6}px)`;
  }
  const rtl = getComputedStyle(document.documentElement).direction === "rtl";
  return `translateX(${rtl ? -distance : distance}px)`;
}

/**
 * Keeps the panel mounted while it slides out, and slides it in on mount.
 * `mounted` drives the layout, so the chat only moves once the panel is gone.
 */
export function usePanelPresence(wanted: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(wanted);

  useEffect(() => {
    if (wanted) {
      setMounted(true);
      return;
    }
    const element = ref.current;
    if (!element) {
      setMounted(false);
      return;
    }
    const exit = element.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: offset(24) },
      ],
      { duration: PANEL_EXIT_MS, easing: EASE_OUT, fill: "forwards" },
    );
    exit.onfinish = () => setMounted(false);
    // Turned back on mid-exit: drop the exit and stay.
    return () => exit.cancel();
  }, [wanted]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!mounted || !element) return;
    element.animate(
      [
        { opacity: 0, transform: offset(40) },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: PANEL_ENTER_MS,
        delay: PANEL_SECTION_STAGGER_MS,
        easing: EASE_OUT,
        fill: "backwards",
      },
    );
    if (matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const sections = element.firstElementChild?.children ?? [];
    Array.from(sections).forEach((section, index) => {
      section.animate(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: PANEL_SECTION_MS,
          delay: PANEL_SECTION_DELAY_MS + index * PANEL_SECTION_STAGGER_MS,
          easing: EASE_OUT,
          fill: "backwards",
        },
      );
    });
  }, [mounted]);

  return { ref, mounted };
}
