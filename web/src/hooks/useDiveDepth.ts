import { type RefObject, useEffect, useState } from "react";
import { diveOffset, pxToMeters } from "#/utils/depth.utils";

/** Meters at the diver line, read from the scroll once per frame at most. */
export function useDiveDepth(waterRef: RefObject<HTMLElement | null>): number {
  const [meters, setMeters] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const water = waterRef.current;
      const top = water
        ? water.getBoundingClientRect().top + scrollY
        : Number.POSITIVE_INFINITY;
      const px = diveOffset(scrollY, top, innerHeight);
      setMeters(px > 0 ? Math.round(pxToMeters(px)) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [waterRef]);

  return meters;
}
