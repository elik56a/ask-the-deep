import { useEffect } from "react";
import { FINE_POINTER_QUERY } from "#/constants/motion.constants";
import type { DiveMode } from "#/types/sea.types";

/**
 * Puts the question field in focus at the surface and at the seabed, on a fine pointer only.
 * At the seabed a touch visitor gets focus on the reveal heading instead, so a screen reader
 * still lands where the chat came back.
 */
export function useAskFocus(mode: DiveMode, askId: string, revealId: string) {
  useEffect(() => {
    if (mode !== "rest" && mode !== "reveal") return;
    const fine = matchMedia(FINE_POINTER_QUERY).matches;
    const id = fine ? askId : mode === "reveal" ? revealId : null;
    if (id) document.getElementById(id)?.focus({ preventScroll: true });
  }, [mode, askId, revealId]);
}
