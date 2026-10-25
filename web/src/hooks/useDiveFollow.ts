import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import { GLIDE_SLACK_PX, SETTLED_PX, SNAP_MS } from "#/constants/sea.constants";
import type { Glide, ScrollDirection } from "#/types/scroll.types";
import type { DiveMode } from "#/types/sea.types";
import { frameSeconds } from "#/utils/ease.utils";
import {
  ascentGlide,
  diverLineY,
  followGlide,
  glideStep,
  inConsole,
  keyDirection,
  scrollIntent,
} from "#/utils/scroll.utils";

const pageTop = (el: HTMLElement | null) =>
  el ? el.getBoundingClientRect().top + scrollY : 0;
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

/**
 * Glides the page so the latest step sits at the diver line (P5.22), with a
 * speed cap so a burst of events reads as a descent, not a jump. Any scroll
 * by the visitor pauses following until `resume`. During the dive the page
 * never scrolls past the latest step, so the seabed waits for the diver;
 * scrolling up pauses, and scrolling back down to the step resumes. In
 * "ascend" it glides to the top and calls `onSurfaced`. Uses `scrollTo`,
 * never `scrollIntoView`.
 * Scrolling inside the chat is not scrolling the dive; any other scroll by the
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

    const glide = (to: Glide, dt: number) => {
      if (Math.abs(scrollY - glideY) > GLIDE_SLACK_PX) glideY = scrollY;
      const snap = reduced.matches || performance.now() < snapUntil.current;
      const next = glideStep(glideY, to, dt, snap);
      if (next === glideY) return;
      glideY = next;
      scrollTo(0, next);
    };

    /** Returns true once at the surface. */
    const ascend = (dt: number) => {
      glide(ascentGlide(scrollY), dt);
      if (scrollY >= SETTLED_PX) return false;
      latest.current.onSurfaced();
      return true;
    };

    const follow = (dt: number) => {
      const { target: step, following: on } = latest.current;
      if (step === null || !waterRef.current) return;
      const to = Math.min(
        diverLineY(pageTop(waterRef.current), step, innerHeight),
        maxScroll(),
      );
      limit.current = mode === "dive" ? to : null;
      // A scroll past the step by the visitor (the scrollbar, a fast flick) snaps back and is following again; the glide's own moves never do.
      const byVisitor = !on || Math.abs(scrollY - glideY) > GLIDE_SLACK_PX;
      if (mode === "dive" && byVisitor && scrollY > to) {
        scrollTo(0, to);
        glideY = to;
        setFollowing(true);
      }
      if (!on) return;
      glide(followGlide(to, rushing.current), dt);
      if (Math.abs(scrollY - to) < SETTLED_PX) rushing.current = false;
    };

    const tick = (now: number) => {
      const dt = frameSeconds(now, last);
      last = now;
      if (mode === "ascend") {
        if (ascend(dt)) return;
      } else {
        follow(dt);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, waterRef]);

  useEffect(() => {
    if (mode !== "dive" && mode !== "reveal") return;
    const scrolled = (event: Event, direction: ScrollDirection | null) => {
      if (!direction || inConsole(event.target)) return;
      const intent = scrollIntent(mode, direction, scrollY, limit.current);
      if (intent === "pause") {
        setFollowing(false);
        latest.current.onUserScroll?.();
      } else if (intent === "hold") {
        event.preventDefault();
        setFollowing(true);
      }
    };
    const onWheel = (event: WheelEvent) =>
      scrolled(event, event.deltaY > 0 ? "down" : "up");
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchY;
      scrolled(event, y < touchY ? "down" : "up");
      touchY = y;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.target !== document.body) return;
      scrolled(event, keyDirection(event.key, event.shiftKey));
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
      scrollTo({
        top: diverLineY(pageTop(waterRef.current), stepTop, innerHeight),
        behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth",
      });
    },
    [waterRef],
  );
  return { following, resume, rush, jump, look };
}
