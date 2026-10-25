import type { useShownDive } from "#/hooks/useShownDive";

/** The dive on screen, as `useShownDive` reads it from the thread. */
export type ShownDive = ReturnType<typeof useShownDive>;
