import type { RefObject } from "react";
import { diveOffset, zoneLabel } from "#/utils/depth.utils";

/** Px of the water column at the diver line; negative while still above the water. */
export function divePx(water: HTMLElement | null): number {
  const top = water
    ? water.getBoundingClientRect().top + scrollY
    : Number.POSITIVE_INFINITY;
  return diveOffset(scrollY, top, innerHeight);
}

/** Keeps `data-zone` on the host in step with scroll, before three.js loads and without WebGL. */
export function trackZone(
  host: HTMLElement,
  waterRef: RefObject<HTMLElement | null>,
): () => void {
  const update = () => {
    host.dataset.zone = zoneLabel(divePx(waterRef.current));
  };
  update();
  addEventListener("scroll", update, { passive: true });
  return () => removeEventListener("scroll", update);
}
