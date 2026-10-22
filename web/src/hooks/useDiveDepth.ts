import { type RefObject, useEffect, useState } from "react";
import { diveOffset, pxToMeters, surfaceEye } from "#/utils/depth.utils";

/**
 * Meters at the diver line, and above the water the eye's height, read from the scroll once per
 * frame at most.
 */
export function useDiveDepth(waterRef: RefObject<HTMLElement | null>) {
  const [depth, setDepth] = useState({ meters: 0, eye: 0 });

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const water = waterRef.current;
      const top = water
        ? water.getBoundingClientRect().top + scrollY
        : Number.POSITIVE_INFINITY;
      const px = diveOffset(scrollY, top, innerHeight);
      const next =
        px > 0
          ? { meters: Math.round(pxToMeters(px)), eye: 0 }
          : {
              meters: 0,
              eye: Number.isFinite(px) ? surfaceEye(scrollY, px) : 0,
            };
      setDepth((d) =>
        d.meters === next.meters && Math.abs(d.eye - next.eye) < 0.05
          ? d
          : next,
      );
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

  return depth;
}
