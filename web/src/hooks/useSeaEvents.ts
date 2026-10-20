import { type RefObject, useEffect, useRef } from "react";
import { BUBBLES_PER_DELTA } from "#/constants/sea.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { DiveStep, SeaControls } from "#/types/sea.types";

/**
 * Plays each new stream event on the sea (P5.23): the lamp while the model
 * thinks, a sonar ring on a tool call, lanterns on the score gate, bubbles
 * for streamed text and a sand puff at the seabed. Events seen while not
 * diving, or restored with the chat, are skipped, so nothing replays by accident.
 */
export function useSeaEvents(
  sea: RefObject<SeaControls | null>,
  events: StreamEvent[],
  steps: DiveStep[],
  tops: number[],
  diving: boolean,
): void {
  const seen = useRef<number | null>(null);

  useEffect(() => {
    // A shorter list is a new run or a replay.
    if (seen.current === null || events.length < seen.current) {
      seen.current = diving ? 0 : events.length;
    }
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    const controls = sea.current;
    if (!diving || !controls) return;
    const px = (item: StreamEvent) => {
      const i = steps.findIndex(
        (step) => step.event.seq === item.seq || step.result?.seq === item.seq,
      );
      return tops[i] ?? tops.at(-1) ?? 0;
    };
    for (const item of fresh) {
      const { event } = item;
      switch (event.type) {
        case "llm.started":
          controls.lamp(true);
          break;
        case "llm.completed":
        case "error":
          controls.lamp(false);
          break;
        case "tool.called":
          controls.sonar(px(item));
          break;
        case "retrieval.completed":
          controls.lanterns(px(item), event.passages, event.threshold);
          break;
        case "text.delta":
          controls.bubbles(BUBBLES_PER_DELTA);
          break;
        case "request.finished":
          controls.lamp(false);
          if (
            event.outcome === "answered" ||
            event.outcome === "no_information"
          ) {
            controls.seabed(px(item));
          }
          break;
      }
    }
  }, [sea, events, steps, tops, diving]);
}
