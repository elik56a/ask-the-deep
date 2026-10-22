import { useState } from "react";
import type { Citation } from "#/generated/events.gen";

/** The one tooltip a row of sources shares, anchored to the chip in hover or focus; it also focuses that passage. */
export function useSourceTip(onFocusChunk: (chunkId: string | null) => void) {
  const [tip, setTip] = useState<{
    citation: Citation;
    anchor: DOMRect;
  } | null>(null);
  const show = (citation: Citation, chip: HTMLElement) => {
    setTip({ citation, anchor: chip.getBoundingClientRect() });
    onFocusChunk(citation.chunk_id);
  };
  const hide = () => {
    setTip(null);
    onFocusChunk(null);
  };
  return { tip, show, hide };
}
