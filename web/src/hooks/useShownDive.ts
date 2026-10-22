import type { RefObject } from "react";
import { BED_BELOW_PX } from "#/constants/sea.constants";
import { useDiveLayout } from "#/hooks/useDiveLayout";
import { usePacedPlayer } from "#/hooks/usePacedPlayer";
import type { ChatMessage } from "#/types/chat.types";
import { answerText, carriedWith, messageEvents } from "#/utils/chat.utils";
import { diveEnd, diveSteps } from "#/utils/depth.utils";
import { streamEnd } from "#/utils/streamWords.utils";
import { threadTurns } from "#/utils/thread.utils";
import { buildTrace, requestModel } from "#/utils/trace.utils";

/**
 * The dive on screen, the newest or the one picked with "Watch again" (`watching`): its paced
 * playback, steps, layout and run, and what the cards know beyond the events.
 */
export function useShownDive(
  messages: ChatMessage[],
  watching: number | null,
  logRef: RefObject<HTMLElement | null>,
) {
  const turns = threadTurns(messages);
  const shown = (watching ? turns[watching - 1] : turns.at(-1)) ?? null;
  const events = shown?.answer ? messageEvents(shown.answer) : [];
  const player = usePacedPlayer(events);
  const steps = diveSteps(player.events);
  const layout = useDiveLayout(
    logRef,
    steps.map((step) => step.kind),
  );
  const trace = buildTrace(player.events);
  const { ended, onSand } = diveEnd(steps);
  const words = shown?.answer ? streamEnd(answerText(shown.answer)) : 0;
  // The sand lies below the report; at the seabed the dive follows down to it and scroll stops there.
  const bed = layout.bottom + BED_BELOW_PX;
  return {
    turns,
    shown,
    events,
    player,
    steps,
    layout,
    trace,
    ended,
    onSand,
    bed,
    floor: onSand ? bed : layout.bottom,
    model: requestModel(events),
    written: { words: Math.round(player.written * words), total: words },
    ctx: {
      carried: shown ? carriedWith(messages, shown.question) : 0,
      skipped: player.skipped,
      wallMs: player.wallMs,
      retrieved: trace.retrieved,
    },
  };
}
