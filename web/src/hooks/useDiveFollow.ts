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
  ASCENT_SLOW_GAIN,
  ASCENT_SLOW_PX,
  DIVER_LINE,
  FOLLOW_GAIN,
  FOLLOW_SPEED,
  GLIDE_SLACK_PX,
  RESYNC_PX,
  RUSH_GAIN,
  RUSH_SPEED,
  SNAP_MS,
} from "#/constants/sea.constants";
import type { DiveMode } from "#/types/sea.types";

const UP_KEYS = ["ArrowUp", "PageUp", "Home"];
const DOWN_KEYS = ["ArrowDown", "PageDown", "End", " "];

/**
 * Glides the page so the latest step sits at the diver line (P5.22), with a
 * speed cap so a burst of events reads as a descent, not a jump. Any scroll
 * by the visitor pauses following until `resume`. During the dive the page
 * never scrolls past the latest step, so the seabed waits for the diver;
 * scrolling up pauses, and scrolling back down to the step resumes. In
 * "ascend" it glides to the top and calls `onSurfaced`. Uses `scrollTo`,
 * never `scrollIntoView`.
 * Scrolling inside the chat (`[data-console]`) is not scrolling the dive; any other scroll by the
 * visitor also calls `onUserScroll`.
 */
export function useDiveFollow(
  mode: DiveMode,
  waterRef: RefObject<HTMLElement | null>,
  target: number | null,
  onSurfaced: () => void,
  onUserScroll?: () => void,
) {
  const [following, setFollowing] = useState(true);
  const latest = useRef({ target, following, onSurfaced, onUserScroll });
  latest.current = { target, following, onSurfaced, onUserScroll };
  const rushing = useRef(false);
  const snapUntil = useRef(0);
  // How far down the visitor may scroll during the dive: the latest step at the diver line.
  const limit = useRef<number | null>(null);

  useEffect(() => {
    if (mode === "dive" || mode === "reveal") setFollowing(true);
  }, [mode]);

  useEffect(() => {
    if (mode === "rest" || mode === "intro") return;
    const reduced = matchMedia(REDUCED_MOTION_QUERY);
    let glideY = scrollY;
    let last = 0;
    let frame = 0;
    const glide = (to: number, speed: number, dt: number, gain: number) => {
      if (Math.abs(scrollY - glideY) > GLIDE_SLACK_PX) glideY = scrollY;
      const gap = to - glideY;
      if (Math.abs(gap) < 0.5) return;
      glideY +=
        reduced.matches || performance.now() < snapUntil.current
          ? gap
          : Math.sign(gap) *
            Math.min(Math.abs(gap) * Math.min(1, dt * gain), speed * dt);
      scrollTo(0, glideY);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const { target: step, following: on } = latest.current;
      const water = waterRef.current;
      if (mode === "ascend") {
        glide(
          0,
          ASCEND_SPEED,
          dt,
          scrollY < ASCENT_SLOW_PX ? ASCENT_SLOW_GAIN : FOLLOW_GAIN,
        );
        if (scrollY < 2) {
          latest.current.onSurfaced();
          return;
        }
      } else if (step !== null && water) {
        const top = water.getBoundingClientRect().top + scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        const to = Math.min(top + step - innerHeight * DIVER_LINE, max);
        limit.current = mode === "dive" ? to : null;
        // A scroll past the step by the visitor (the scrollbar, a fast flick) snaps back and is following again; the glide's own moves never do.
        const byVisitor = !on || Math.abs(scrollY - glideY) > GLIDE_SLACK_PX;
        if (mode === "dive" && byVisitor && scrollY > to) {
          scrollTo(0, to);
          glideY = to;
          setFollowing(true);
        }
        if (!on) {
          frame = requestAnimationFrame(tick);
          return;
        }
        const rush = rushing.current;
        glide(
          to,
          rush ? RUSH_SPEED : FOLLOW_SPEED,
          dt,
          rush ? RUSH_GAIN : FOLLOW_GAIN,
        );
        if (Math.abs(scrollY - to) < 2) rushing.current = false;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, waterRef]);

  useEffect(() => {
    if (mode !== "dive" && mode !== "reveal") return;
    const pause = () => {
      setFollowing(false);
      latest.current.onUserScroll?.();
    };
    // At the seabed any scroll pauses; during the dive only scrolling up does, and scrolling down stops at the step.
    const scrolled = (event: Event, down: boolean) => {
      const inChat =
        event.target instanceof Element &&
        event.target.closest("[data-console]");
      if (inChat) return;
      const stop = limit.current;
      if (mode === "reveal" || !down) pause();
      else if (stop !== null && scrollY >= stop - RESYNC_PX) {
        event.preventDefault();
        setFollowing(true);
      }
    };
    const onWheel = (event: WheelEvent) => scrolled(event, event.deltaY > 0);
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchY;
      scrolled(event, y < touchY);
      touchY = y;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.target !== document.body) return;
      const down = DOWN_KEYS.includes(event.key) && !event.shiftKey;
      if (down || UP_KEYS.includes(event.key) || event.key === " ") {
        scrolled(event, down);
      }
    };
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: false });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("keydown", onKey);
    };
  }, [mode]);

  const resume = useCallback(() => setFollowing(true), []);
  const rush = useCallback(() => {
    rushing.current = true;
    setFollowing(true);
  }, []);
  const jump = useCallback(() => {
    snapUntil.current = performance.now() + SNAP_MS;
    setFollowing(true);
  }, []);
  /** Stops following and scrolls back up to the step at `stepTop`. */
  const look = useCallback(
    (stepTop: number) => {
      setFollowing(false);
      const water = waterRef.current;
      const top = water ? water.getBoundingClientRect().top + scrollY : 0;
      scrollTo({
        top: top + stepTop - innerHeight * DIVER_LINE,
        behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth",
      });
    },
    [waterRef],
  );
  return { following, resume, rush, jump, look };
}
