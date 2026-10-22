import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  ASCEND_SPEED,
  DIVER_LINE,
  FOLLOW_SPEED,
} from "#/constants/sea.constants";
import type { DiveMode } from "#/types/sea.types";

const SCROLL_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
];

/**
 * Glides the page so the latest step sits at the diver line (P5.22), with a
 * speed cap so a burst of events reads as a descent, not a jump. Any scroll
 * by the visitor pauses following until `resume`. In "ascend" it glides to
 * the top and calls `onSurfaced`. Uses `scrollTo`, never `scrollIntoView`.
 */
export function useDiveFollow(
  mode: DiveMode,
  waterRef: RefObject<HTMLElement | null>,
  target: number | null,
  onSurfaced: () => void,
) {
  const [following, setFollowing] = useState(true);
  const latest = useRef({ target, following, onSurfaced });
  latest.current = { target, following, onSurfaced };

  useEffect(() => {
    if (mode === "dive" || mode === "reveal") setFollowing(true);
  }, [mode]);

  useEffect(() => {
    if (mode === "rest") return;
    const reduced = matchMedia(REDUCED_MOTION_QUERY);
    let glideY = scrollY;
    let last = 0;
    let frame = 0;
    const glide = (to: number, speed: number, dt: number) => {
      if (Math.abs(scrollY - glideY) > 3) glideY = scrollY;
      const gap = to - glideY;
      if (Math.abs(gap) < 0.5) return;
      glideY += reduced.matches
        ? gap
        : Math.sign(gap) *
          Math.min(Math.abs(gap) * Math.min(1, dt * 2.4), speed * dt);
      scrollTo(0, glideY);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const { target: step, following: on } = latest.current;
      const water = waterRef.current;
      if (mode === "ascend") {
        glide(0, ASCEND_SPEED, dt);
        if (scrollY < 2) {
          latest.current.onSurfaced();
          return;
        }
      } else if (on && step !== null && water) {
        const top = water.getBoundingClientRect().top + scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        glide(
          Math.min(top + step - innerHeight * DIVER_LINE, max),
          FOLLOW_SPEED,
          dt,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, waterRef]);

  useEffect(() => {
    if (mode !== "dive" && mode !== "reveal") return;
    const pause = () => setFollowing(false);
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.includes(event.key) && event.target === document.body) {
        pause();
      }
    };
    addEventListener("wheel", pause, { passive: true });
    addEventListener("touchmove", pause, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("wheel", pause);
      removeEventListener("touchmove", pause);
      removeEventListener("keydown", onKey);
    };
  }, [mode]);

  const resume = useCallback(() => setFollowing(true), []);
  return { following, resume };
}
