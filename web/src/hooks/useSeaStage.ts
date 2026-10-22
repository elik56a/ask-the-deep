import { type RefObject, useEffect } from "react";
import { ASCENT_BUBBLES } from "#/constants/sea.constants";
import type { ChatState } from "#/types/chat.types";
import type { DiveMode, SeaControls } from "#/types/sea.types";

/**
 * Keeps the sea in step with the page: lit and lifted on the sand with the full chat, shifted
 * beside the cards while they are read, the seabed at `bed`, and bubbles on the way up.
 */
export function useSeaStage(
  sea: RefObject<SeaControls | null>,
  mode: DiveMode,
  chat: ChatState,
  bed: number | null,
): void {
  const revealed = mode === "reveal";
  useEffect(() => {
    sea.current?.landed(revealed && chat === "full");
    sea.current?.shifted(mode === "dive" || (revealed && chat !== "full"));
  }, [sea, mode, revealed, chat]);

  useEffect(() => {
    if (revealed && bed !== null) sea.current?.seabed(bed);
  }, [sea, revealed, bed]);

  useEffect(() => {
    if (mode !== "ascend") return;
    const timer = setInterval(
      () => sea.current?.bubbles(ASCENT_BUBBLES.count),
      ASCENT_BUBBLES.everyMs,
    );
    return () => clearInterval(timer);
  }, [sea, mode]);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-diving",
      mode !== "rest" && mode !== "intro",
    );
  }, [mode]);
}
