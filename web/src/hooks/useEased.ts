import { useEffect, useRef, useState } from "react";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import { frameSeconds } from "#/utils/ease.utils";

/**
 * Each number counts toward its new value instead of jumping, the way the server's numbers stream
 * in; reduced motion shows the new values at once.
 */
export function useEased(targets: number[]): number[] {
  const [shown, setShown] = useState(targets);
  const now = useRef(targets);
  const goal = useRef(targets);
  goal.current = targets;
  const key = targets.join();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the targets, read from the ref
  useEffect(() => {
    if (matchMedia(REDUCED_MOTION_QUERY).matches) {
      now.current = goal.current;
      setShown(goal.current);
      return;
    }
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      const dt = frameSeconds(time, last);
      last = time;
      const k = Math.min(1, dt * 7);
      let moving = false;
      now.current = now.current.map((value, i) => {
        const to = goal.current[i] ?? 0;
        const next = value + (to - value) * k;
        if (Math.abs(to - next) < Math.max(Math.abs(to) * 1e-4, 1e-7))
          return to;
        moving = true;
        return next;
      });
      setShown(now.current);
      if (moving) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key]);

  return shown;
}
