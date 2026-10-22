import type { Lang } from "#/types/i18n.types";
import type { PreDiveCopy } from "#/types/predive.types";

// The first check lands after the veil has faded in; each next one with one notch of the wheel.
export const FIRST_TICK_MS = 1100;
export const TICK_MS = 420;
// The full ring holds a beat before the countdown drains it.
export const HOLD_MS = 600;
export const COUNT_MS = 1000;
export const COUNT_FROM = 3;
export const REPLAY_COUNT_FROM = 2;
export const VEIL_FADE_MS = 700;

// A live question has no stream yet; ADR 0019 paces a dive at about 30 s.
export const PACE_ESTIMATE_MS = 30_000;

export const HELM_RING_R = 66;
export const HELM_NOTCH = Math.PI / 4;

// The wheel's own materials and lights (sRGB hex; three converts them).
export const HELM_WOOD = 0x5e3216;
export const HELM_BRASS = 0xe0b055;
export const HELM_BRASS_GLOW = 0x3a2508;
export const HELM_SKY = 0xcfefff;
export const HELM_GROUND = 0x06192f;
export const HELM_KEY = 0xfff0d2;
export const HELM_RIM = 0x5ef2e0;

// One turned spoke along +Y: [radius, height] from the hub out through the rim to a handle.
export const HELM_SPOKE: [number, number][] = [
  [0, 0.18],
  [0.04, 0.18],
  [0.034, 0.3],
  [0.03, 0.72],
  [0.04, 0.8],
  [0.03, 0.9],
  [0.05, 0.96],
  [0.038, 1.02],
  [0.06, 1.1],
  [0.052, 1.18],
  [0.03, 1.22],
  [0, 1.23],
];

export const PREDIVE_COPY: Record<Lang, PreDiveCopy> = {
  en: {
    eyebrow: "Dive {n} · pre-dive check",
    replayTag: "Dive {n} · replay · pre-dive check",
    title: {
      first: "Ready to go under?",
      again: "Ready to go back under?",
      replay: "Ready to watch dive {n} again?",
    },
    checksLabel: "Pre-dive check",
    checks: {
      packed: ["Question packed", "{n} characters"],
      carried: ["Conversation on board", "{n} earlier + 1 new"],
      fresh: ["Fresh conversation", "nothing earlier travels"],
      unstored: ["Nothing stored", "no logs · no traces · no database"],
      paced: ["Paced for you", "≈ {s} s · pause or skip"],
      recording: ["Recording found", "{n} events, kept in this tab"],
      timings: ["Real server timings", "{t} on the server"],
    },
    read: { checks: "checks", countdown: "descending in" },
    cargo: {
      summary: "See what travels with it",
      you: "You",
      agent: "Agent",
      wire: "POST /api/chat · {n} earlier + 1 new · the server keeps none of it",
    },
    cancel: "Not now",
    descend: "Descend ↓",
    say: {
      start: "Pre-dive check for: {q}",
      ready: "All clear. Descending in {n} seconds.",
    },
  },
  he: {
    eyebrow: "צלילה {n} · בדיקה לפני צלילה",
    replayTag: "צלילה {n} · צפייה חוזרת · בדיקה לפני צלילה",
    title: {
      first: "מוכנים לצלול?",
      again: "צוללים שוב?",
      replay: "לצפות שוב בצלילה {n}?",
    },
    checksLabel: "בדיקה לפני צלילה",
    checks: {
      packed: ["השאלה ארוזה", "{n} תווים"],
      carried: ["השיחה עולה איתנו", "{n} קודמות + 1 חדשה"],
      fresh: ["שיחה חדשה", "שום דבר קודם לא נשלח"],
      unstored: ["שום דבר לא נשמר", "בלי לוגים · בלי מעקב · בלי מסד נתונים"],
      paced: ["בקצב שלך", "≈ {s} שנ׳ · אפשר לעצור או לדלג"],
      recording: ["ההקלטה נמצאה", "{n} אירועים, שמורים בלשונית הזו"],
      timings: ["זמני השרת האמיתיים", "{t} בשרת"],
    },
    read: { checks: "בדיקות", countdown: "צוללים בעוד" },
    cargo: {
      summary: "מה נשלח יחד איתה",
      you: "אתם",
      agent: "הסוכן",
      wire: "POST /api/chat · {n} קודמות + 1 חדשה · השרת לא שומר דבר מזה",
    },
    cancel: "לא עכשיו",
    descend: "לצלול ↓",
    say: {
      start: "בדיקה לפני צלילה: {q}",
      ready: "הכול תקין. צוללים בעוד {n} שניות.",
    },
  },
};
