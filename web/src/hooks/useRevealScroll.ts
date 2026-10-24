import { useEffect, useRef } from "react";
import { SAND_SLACK_PX, SURFACE_SHARE } from "#/constants/sea.constants";

const atSand = () =>
  scrollY >=
  document.documentElement.scrollHeight - innerHeight - SAND_SLACK_PX;

/**
 * Scrolling at the seabed (`on`): back down onto the sand, by scroll (`onSand`) or a wheel past
 * the end (`onPush`), the full chat returns; all the way back up (`onTop`) the ascent glides the
 * rest of the way. A wheel inside the chat is the chat's own.
 */
export function useRevealScroll(
  on: boolean,
  onSand: () => void,
  onPush: () => void,
  onTop: () => void,
): void {
  const actions = useRef({ onSand, onPush, onTop });
  actions.current = { onSand, onPush, onTop };

  useEffect(() => {
    if (!on) return;
    let prev = scrollY;
    const onScroll = () => {
      if (scrollY > prev && atSand()) actions.current.onSand();
      if (scrollY < prev && scrollY < innerHeight * SURFACE_SHARE)
        actions.current.onTop();
      prev = scrollY;
    };
    const onWheel = (event: WheelEvent) => {
      const inChat =
        event.target instanceof Element &&
        event.target.closest("[data-console]");
      if (event.deltaY > 0 && atSand() && !inChat) actions.current.onPush();
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("wheel", onWheel);
    };
  }, [on]);
}
