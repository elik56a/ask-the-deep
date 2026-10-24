import { type RefObject, useEffect } from "react";

/** Publishes where an element ends on screen as the CSS variable `name`, so fixed layers can stop clear of it (the hero, the server panel). */
export function useBottomVar(ref: RefObject<HTMLElement | null>, name: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement.style;
    // In page coordinates unless the element is fixed, so a scrolled dive never skews it.
    const measure = () => {
      const fixed = getComputedStyle(element).position === "fixed";
      const bottom = element.getBoundingClientRect().bottom;
      root.setProperty(
        name,
        `${Math.ceil(fixed ? bottom : bottom + scrollY)}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
      root.removeProperty(name);
    };
  }, [ref, name]);
}
