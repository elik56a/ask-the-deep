import type { StreamEvent } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import type { DiveCopy, StepKind, Zone } from "#/types/sea.types";

// Real ocean zones in meters; the last one is the deepest trench.
export const ZONES: Zone[] = [
  { id: "sunlight", from: 0, to: 200 },
  { id: "twilight", from: 200, to: 1000 },
  { id: "midnight", from: 1000, to: 4000 },
  { id: "abyss", from: 4000, to: 6000 },
  { id: "trench", from: 6000, to: 11000 },
];

// Every zone gets the same scroll height, so meters are non-linear in pixels.
export const ZONE_PX = 900;
// Room for the zone label when a step sits right at the top of its zone.
export const ZONE_HEAD = 64;
export const STEP_GAP = 120;

// Stage = zone: each step starts no higher than its stage's zone.
export const FLOOR_M: Record<StepKind, number> = {
  start: 0,
  guard: 0,
  llm: 200,
  tool: 1000,
  gen: 4000,
  decision: 4000,
  cite: 4000,
  seabed: 5500,
  abort: 0,
};

// The diver rides at 30% of the viewport height; the latest step is followed to this line.
export const DIVER_LINE = 0.3;
// three.js units of camera travel per zone.
export const WORLD_PER_ZONE = 60;
export const SEA_MAX_PIXEL_RATIO = 1.75;
// Scroll speed caps in px per second: following a step, and the ascent.
export const FOLLOW_SPEED = 1600;
export const ASCEND_SPEED = 3400;
// Rail ticks between zone borders.
export const RAIL_TICKS = 3;

export const SEARCH_TOOL = "search_knowledge";
// Bubbles that carry each streamed chunk of the answer up.
export const BUBBLES_PER_DELTA = 3;

// These close or feed an existing step instead of adding one; text and usage go to the console and the HUD.
export const EVENTS_WITHOUT_STEP: StreamEvent["event"]["type"][] = [
  "llm.completed",
  "tool.completed",
  "retrieval.started",
  "text.delta",
  "usage.reported",
];

// Each stage has its own glow, set as `--c` for the card, its pin and its badge.
export const STEP_TONE: Record<StepKind, string> = {
  start: "[--c:var(--color-text)]",
  guard: "[--c:var(--color-ok)]",
  llm: "[--c:var(--color-accent)]",
  tool: "[--c:var(--color-peri)]",
  gen: "[--c:var(--color-haze)]",
  decision: "[--c:var(--color-haze)]",
  cite: "[--c:var(--color-haze)]",
  seabed: "[--c:var(--color-haze)]",
  abort: "[--c:var(--color-warn)]",
};

// Keyframes over zone position (0 = the waterline, 1 = one zone down).
export const WATER_KEYS: [number, string][] = [
  [0, "--color-water-0"],
  [0.6, "--color-water-1"],
  [1.4, "--color-water-2"],
  [2.4, "--color-water-3"],
  [3.5, "--color-water-4"],
  [5, "--color-water-5"],
];
export const FOG_KEYS: [number, number][] = [
  [0, 0.02],
  [1, 0.032],
  [2.5, 0.05],
  [5, 0.06],
];
export const AMBIENT_KEYS: [number, number][] = [
  [0, 0.95],
  [0.8, 0.45],
  [1.6, 0.14],
  [3, 0.05],
  [5, 0.03],
];
export const SUNLIGHT_KEYS: [number, number][] = [
  [0, 0.7],
  [1, 0.1],
  [2, 0],
];
export const SHAFT_KEYS: [number, number][] = [
  [0, 0.13],
  [0.7, 0.05],
  [1, 0],
];

export const DIVE_COPY: Record<Lang, DiveCopy> = {
  en: {
    zones: {
      sunlight: "Sunlight zone",
      twilight: "Twilight zone",
      midnight: "Midnight zone",
      abyss: "Abyss",
      trench: "Trench",
    },
    steps: {
      step: "Step {n}",
      request: "Request",
      requestTitle: "Your question reached the server",
      safety: "Safety checks",
      safetyPassed: "All {n} safety checks passed",
      safetyBlocked: "Safety checks stopped the question ({p}/{n} passed)",
      cache: "Cache",
      cacheHit: "Found a saved answer",
      cacheMiss: "No saved answer, asking the model",
      modelCall: "Model call {n}",
      loopRound: "agent loop, round {n}",
      thinking: "The model is deciding what to do next",
      unfinished: "The model call didn't finish",
      choseSearch: "The model chose to search Eliyahu's notes",
      choseTool: "The model chose to use {tool}",
      choseAnswer: "The model chose to write the final answer",
      choseText: "The model replied in plain text",
      toolCall: "Tool call · {tool}",
      searching: "Searching Eliyahu's notes",
      running: "Running {tool}",
      results: "Search results",
      resultsGood: "Scored {n} passages, {g} good enough to use",
      resultsNone: "Scored {n} passages, none good enough",
      writing: "Writing",
      writingFrom: "Writing the answer from {n} passages",
      writingNone: "Writing a reply with no passages to use",
      decision: "Decision",
      decisionAnswer: "The answer is backed by the notes, so it goes out",
      decisionNoInfo:
        "Not enough in the notes, so the agent says it doesn't know",
      sources: "Sources",
      sourcesChecked: "Checked {n} sources against the search",
      sourcesNone: "No sources to check",
      done: "Done",
      seabedAnswered: "Seabed · answer delivered",
      seabedNoInfo: "Seabed · nothing in the notes",
      stopped: "Stopped",
      calledOff: "Dive called off",
      error: "Error",
      errorTitle: "Something went wrong on the server",
    },
    logLabel: "Dive log",
    guide: [
      "Each card is ",
      "one step the server takes",
      " to answer you. The deeper we go, the further along the process is.",
    ],
    follow: "Follow the dive",
    surface: "Surface",
    replay: "Replay the dive",
  },
  he: {
    zones: {
      sunlight: "אזור אור השמש",
      twilight: "אזור הדמדומים",
      midnight: "אזור חצות",
      abyss: "התהום",
      trench: "השוחה",
    },
    steps: {
      step: "שלב {n}",
      request: "בקשה",
      requestTitle: "השאלה שלך הגיעה לשרת",
      safety: "בדיקות בטיחות",
      safetyPassed: "כל {n} בדיקות הבטיחות עברו",
      safetyBlocked: "בדיקות הבטיחות עצרו את השאלה ({p}/{n} עברו)",
      cache: "מטמון",
      cacheHit: "נמצאה תשובה שמורה",
      cacheMiss: "אין תשובה שמורה, שואלים את המודל",
      modelCall: "קריאה למודל {n}",
      loopRound: "לולאת הסוכן, סבב {n}",
      thinking: "המודל מחליט מה לעשות עכשיו",
      unfinished: "הקריאה למודל לא הסתיימה",
      choseSearch: "המודל בחר לחפש ברשימות של אליהו",
      choseTool: "המודל בחר להשתמש ב־{tool}",
      choseAnswer: "המודל בחר לכתוב את התשובה הסופית",
      choseText: "המודל ענה בטקסט חופשי",
      toolCall: "קריאה לכלי · {tool}",
      searching: "מחפשים ברשימות של אליהו",
      running: "מריצים את {tool}",
      results: "תוצאות החיפוש",
      resultsGood: "דורגו {n} קטעים, {g} טובים מספיק לשימוש",
      resultsNone: "דורגו {n} קטעים, אף אחד לא טוב מספיק",
      writing: "כתיבה",
      writingFrom: "כותבים את התשובה מתוך {n} קטעים",
      writingNone: "כותבים תשובה בלי קטעים לשימוש",
      decision: "החלטה",
      decisionAnswer: "התשובה מגובה ברשימות, אז היא יוצאת",
      decisionNoInfo: "אין מספיק ברשימות, אז הסוכן אומר שהוא לא יודע",
      sources: "מקורות",
      sourcesChecked: "{n} מקורות נבדקו מול החיפוש",
      sourcesNone: "אין מקורות לבדוק",
      done: "סיום",
      seabedAnswered: "קרקעית · התשובה נמסרה",
      seabedNoInfo: "קרקעית · אין על זה ברשימות",
      stopped: "נעצר",
      calledOff: "הצלילה בוטלה",
      error: "שגיאה",
      errorTitle: "משהו השתבש בשרת",
    },
    logLabel: "יומן הצלילה",
    guide: [
      "כל כרטיס הוא ",
      "צעד אחד שהשרת עושה",
      " כדי לענות לך. ככל שצוללים עמוק יותר, התהליך מתקדם יותר.",
    ],
    follow: "לעקוב אחרי הצלילה",
    surface: "חזרה לפני המים",
    replay: "לצלול שוב",
  },
};
