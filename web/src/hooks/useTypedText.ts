import { useEffect, useState } from "react";
import { TYPE_WORD_MS } from "#/constants/chat.constants";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";

/**
 * Types `text` out word by word each time `run` turns on, the way the answer arrives at the
 * seabed; reduced motion, or no `run`, shows it whole.
 */
export function useTypedText(text: string, run: boolean): string {
  const words = text.split(/(?<=\s)/);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (run) {
      setCount(
        matchMedia(REDUCED_MOTION_QUERY).matches ? Number.POSITIVE_INFINITY : 1,
      );
    }
  }, [run]);

  useEffect(() => {
    if (!run || count >= words.length) return;
    const timer = setTimeout(() => setCount((c) => c + 1), TYPE_WORD_MS);
    return () => clearTimeout(timer);
  }, [run, count, words.length]);

  return run && count < words.length ? words.slice(0, count).join("") : text;
}
