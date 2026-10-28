export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Touch skips autofocus, or the keyboard would open over the hero.
export const FINE_POINTER_QUERY = "(pointer: fine)";

// Phones and tablets get the lighter sea (LITE in seaScene.constants.ts).
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

// The UI's ease-out (`--ease-out` in styles.css), for Web Animations.
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// Step cards (P5.39): the log re-lays out by sliding, a folding title shrinks into place, its body brightens.
export const RELAYOUT_MS = 420;
export const FOLD_MS = 380;
export const FOLD_FADE_MS = 260;
export const FOLD_FADE_FROM = 0.6;
// The narration streams on a few words after the title.
export const SAY_AFTER_WORDS = 4;
// The chat steps aside before the pre-dive check, and slides in on each state change at the seabed.
export const CONSOLE_LEAVE = { ms: 200, dropPx: 8 } as const;
export const CONSOLE_SWAP = { ms: 320, risePx: 10 } as const;
// Frames are at most this long (s), so a stall never jumps a scene or a glide.
export const MAX_FRAME_S = 0.05;
