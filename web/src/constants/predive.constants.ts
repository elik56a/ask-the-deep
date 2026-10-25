import type { Lang } from "#/types/i18n.types";
import type { PreDiveCopy } from "#/types/predive.types";

// The first check lands once the slate is up and the diver has swum close; then one per tick.
export const FIRST_TICK_MS = 900;
export const TICK_MS = 380;
// All checks ticked, a beat before the countdown runs down the Jump button.
export const HOLD_MS = 500;
export const COUNT_MS = 900;
export const COUNT_FROM = 3;
export const REPLAY_COUNT_FROM = 2;
// The slate drops away while the diver leaps; the dialog closes after it.
export const SLATE_EXIT_MS = 420;

// A live question has no stream yet; ADR 0019 paces a dive at about 30 s.
export const PACE_ESTIMATE_MS = 30_000;

export const PREDIVE_COPY: Record<Lang, PreDiveCopy> = {
  en: {
    eyebrow: "Dive {n} · buddy check",
    replayTag: "Dive {n} · replay · buddy check",
    title: {
      first: "Ready to go under?",
      again: "Ready to go back under?",
      replay: "Ready to watch dive {n} again?",
    },
    checksLabel: "Buddy check",
    checks: {
      packed: ["Question packed", "{n} characters"],
      carried: ["Conversation on board", "{n} earlier + 1 new"],
      fresh: ["Fresh conversation", "nothing earlier travels"],
      unstored: ["Nothing stored", "no logs · no traces · no database"],
      paced: ["Paced for you", "≈ {s} s · pause or skip"],
      recording: ["Recording found", "{n} events, kept in this tab"],
      timings: ["Real server timings", "{t} on the server"],
    },
    read: { checks: "checks", countdown: "jumping in" },
    cargo: {
      summary: "See what travels with it",
      you: "You",
      agent: "Agent",
      wire: "POST /api/chat · {n} earlier + 1 new · the server keeps none of it",
    },
    cancel: "Not now",
    descend: "Jump in ↓",
    say: {
      start: "Buddy check for: {q}",
      ready: "All clear. Jumping in {n} seconds.",
    },
  },
  he: {
    eyebrow: "צלילה {n} · בדיקת חבר",
    replayTag: "צלילה {n} · צפייה חוזרת · בדיקת חבר",
    title: {
      first: "מוכנים לצלול?",
      again: "צוללים שוב?",
      replay: "לצפות שוב בצלילה {n}?",
    },
    checksLabel: "בדיקת חבר",
    checks: {
      packed: ["השאלה ארוזה", "{n} תווים"],
      carried: ["השיחה עולה איתנו", "{n} קודמות + 1 חדשה"],
      fresh: ["שיחה חדשה", "שום דבר קודם לא נשלח"],
      unstored: ["שום דבר לא נשמר", "בלי לוגים · בלי מעקב · בלי מסד נתונים"],
      paced: ["בקצב שלך", "≈ {s} שנ׳ · אפשר לעצור או לדלג"],
      recording: ["ההקלטה נמצאה", "{n} אירועים, שמורים בלשונית הזו"],
      timings: ["זמני השרת האמיתיים", "{t} בשרת"],
    },
    read: { checks: "בדיקות", countdown: "קופצים בעוד" },
    cargo: {
      summary: "מה נשלח יחד איתה",
      you: "אתם",
      agent: "הסוכן",
      wire: "POST /api/chat · {n} קודמות + 1 חדשה · השרת לא שומר דבר מזה",
    },
    cancel: "לא עכשיו",
    descend: "קופצים למים ↓",
    say: {
      start: "בדיקת חבר: {q}",
      ready: "הכול תקין. קופצים בעוד {n} שניות.",
    },
  },
};
