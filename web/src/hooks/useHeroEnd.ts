import { type RefObject, useEffect } from "react";

/** Publishes where the hero ends as `--hero-end`, so the chat at the surface stops below it. */
export function useHeroEnd(heroRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--hero-end",
        `${Math.ceil(hero.getBoundingClientRect().bottom)}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
    };
  }, [heroRef]);
}
