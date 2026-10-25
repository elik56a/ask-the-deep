import type { StreamEvent } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import type { DiveCopy, StepKind, Zone } from "#/types/sea.types";
import type { StageId } from "#/types/trace.types";

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
export const DIVER_LINE = 0.26;

// The camera starts on the boat this high (world units read as meters) and sinks to the waterline.
export const SURFACE_Y = 2.4;
export const WATERLINE_Y = -4;

// The depth tag's readings. Water temperature by depth (m → °C), roughly a mid-latitude ocean.
export const WATER_TEMP_KEYS: [number, number][] = [
  [0, 24],
  [200, 13],
  [1000, 4],
  [4000, 2],
  [6000, 1.5],
  [11000, 2.5],
];
// Above the water: air at the surface, cooling ~6.5 °C per km, pressure falling with a scale height.
export const AIR_C = 26;
export const AIR_LAPSE_C_PER_M = 0.0065;
export const AIR_SCALE_HEIGHT_M = 8434;
// three.js units of camera travel per zone.
export const WORLD_PER_ZONE = 60;
export const SEA_MAX_PIXEL_RATIO = 1.75;
// Scroll speed caps in px per second: following a step, and the ascent.
export const FOLLOW_SPEED = 1400;
export const ASCEND_SPEED = 3400;
// "Seabed ↓" glides back down this fast, and harder, than the dive's own follow.
export const RUSH_SPEED = 9000;
// How hard the glide pulls towards its target, per second: following, rushing, and the ascent,
// which slows over its last stretch so it settles at the surface instead of stopping dead.
export const FOLLOW_GAIN = 2.2;
export const RUSH_GAIN = 6;
export const ASCENT_SLOW_PX = 1200;
export const ASCENT_SLOW_GAIN = 1.2;
// The ascent never crawls slower than this (px per second), so its last stretch lands instead
// of trailing off: from where scrolling up hands over, the chat is back in under half a second.
export const ASCENT_MIN_SPEED = 1500;
// The diver breathes out bubbles on the way up.
export const ASCENT_BUBBLES = { everyMs: 200, count: 3 } as const;
// Scrolling up from the seabed into this top share of the first screen surfaces.
export const SURFACE_SHARE = 0.35;
// Within this of the page end, the visitor is on the sand.
export const SAND_SLACK_PX = 24;
// A scroll position this far from the glide's own was moved by the visitor.
export const GLIDE_SLACK_PX = 3;
// Scrolling back down to within this of the latest step resumes following.
export const RESYNC_PX = 8;
// After a skip the view snaps to the newest step while the log settles.
export const SNAP_MS = 800;
// The glide is there once it is this close (px); the follow stops rushing within `SETTLED_PX`.
export const GLIDE_DONE_PX = 0.5;
export const SETTLED_PX = 2;
// Keys that scroll the page; Shift turns the space bar up and the others off.
export const SCROLL_DOWN_KEYS = ["ArrowDown", "PageDown", "End"];
export const SCROLL_UP_KEYS = ["ArrowUp", "PageUp", "Home"];

// Landed (the sand with the full chat): the 3D view lifts this share of the screen so the seabed
// shows above the chat, the fog thins by this share, and the lander's lights come up.
export const LAND_LIFT = 0.32;
export const LAND_FOG_CUT = 0.62;
// The sand lies this far below the report card.
export const BED_BELOW_PX = 160;
// The server panel's fish, lit on its own (sRGB hex).
export const BUDDY_SKY = 0xcfefff;
export const BUDDY_GROUND = 0x06192f;
export const BUDDY_KEY = 0xfff0d2;
// The server panel's fish: its camera and lights, how much of the view it fills (room for the
// swinging tail), and its pace and sway while the server works or rests.
export const BUDDY = {
  fov: 26,
  near: 0.1,
  far: 50,
  eye: [0, 0.2, 7],
  maxPixelRatio: 2,
  sky: 1.2,
  key: 1.3,
  keyAt: [-2, 3, 4],
  fill: 0.78,
  busyPace: 2.6,
  restPace: 0.6,
  paceRate: 3,
  turn: -0.4,
  sway: 0.18,
  swayRate: 0.7,
  bob: 0.08,
} as const;
// Rail ticks between zone borders.
export const RAIL_TICKS = 3;

export const SEARCH_TOOL = "search_knowledge";
// Bubbles that carry each streamed word of the answer up.
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
  [0, 0.018],
  [1, 0.03],
  [2.5, 0.045],
  [5, 0.055],
];
export const AMBIENT_KEYS: [number, number][] = [
  [0, 0.95],
  [0.8, 0.5],
  [1.6, 0.3],
  [3, 0.24],
  [5, 0.22],
];
export const SUNLIGHT_KEYS: [number, number][] = [
  [0, 0.7],
  [1, 0.1],
  [2, 0],
];
export const SHAFT_KEYS: [number, number][] = [
  [0, 0.14],
  [0.7, 0.06],
  [1.1, 0],
];
// The camera's torch comes on below the twilight zone.
// The vignette darkens the view's edges with depth.
export const VIGNETTE_KEYS: [number, number][] = [
  [0, 0.25],
  [1.5, 0.7],
  [3, 0.95],
];
export const TORCH_KEYS: [number, number][] = [
  [0, 0],
  [0.9, 0],
  [1.4, 3.4],
  [5, 4.2],
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
      requestCarried:
        "Your question reached the server, carrying {n} earlier messages",
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
      resultsGood: "{g} of {n} passages are on topic",
      resultsNone: "None of {n} passages is on topic",
      writing: "Writing",
      writingFrom: "Writing the answer from {n} passages",
      writingNone: "Writing a reply with no passages to use",
      decision: "Decision",
      decisionAnswer: "The answer is backed by the notes, so it goes out",
      decisionNoInfo:
        "Not enough in the notes, so the agent says it doesn't know",
      sources: "Sources",
      sourcesChecked: "{m} of {n} sources match this dive's search",
      sourcesNone: "No sources to check",
      done: "Done",
      seabedAnswered: "Seabed · answer delivered",
      seabedNoInfo: "Seabed · nothing in the notes",
      stopped: "Stopped",
      calledOff: "Dive called off",
      error: "Error",
      errorTitle: "Something went wrong on the server",
    },
    say: {
      request:
        "It just left your browser over a streaming connection. Nothing about it is stored: not the question, not the answer.",
      requestCarried:
        "The browser sent the whole conversation again. The server remembers nothing between questions, so this is how the agent knows what “those” means.",
      guard:
        "Before any AI runs, the server makes cheap checks: is this a human, under the rate limit and inside today's budget, and is the message a sane size?",
      guardBlocked:
        "One of the checks failed, so no model runs and nothing is spent.",
      cacheHit:
        "This question was answered recently, so the saved answer comes back and no model runs.",
      cacheMiss:
        "Nothing is saved for this question yet, so the model answers it fresh.",
      llmFirst:
        "The model reads your question with what the search found, then picks a move: answer now, or use another tool first.",
      llmFirstCarried:
        "The model reads your question with the earlier messages and what the search found, then picks a move: answer now, or use another tool first.",
      llmRound:
        "Round {n} of the agent loop. The model now has the search results and decides again.",
      choseTool: "It can't answer from memory, so it calls a tool: {tool}.",
      choseAnswer: "It has what it needs, so it writes the final answer.",
      choseText: "It replied in plain text, without the checked answer.",
      unfinished: "The call stopped before the model decided.",
      search:
        "Your question becomes a search: {q}. It runs as a meaning search and a keyword search at the same time, and the two result lists are merged.",
      searchCarried:
        "The model turned your follow-up into a precise search: {q}. It runs as a meaning search and a keyword search at the same time, and the two result lists are merged.",
      searchMore:
        "The first results missed part of your question, so the model searches again: {q}. Again a meaning search and a keyword search, merged.",
      tool: "The model calls {tool} to read this straight from Eliyahu's data, with no search needed.",
      results:
        "Every passage gets a relevance score. Only passages above the {t} line reach the model. The rest sink, and the model never sees them. A high score means on topic, not an answer: the model reads them and decides what answers the question.",
      writingFrom:
        "The model writes using only the passages that passed the gate. It streams back word by word. You'll read it at the seabed.",
      writingNone:
        "With nothing to stand on, the model is told to say it doesn't know instead of guessing.",
      decisionAnswer:
        "This check is code, not the model. The best passage scored {s} against a {t} gate, and the answer cites what it uses.",
      decisionNoInfo:
        "This check is code, not the model. Nothing scored above {t}, so instead of guessing, the agent says it doesn't know.",
      sources:
        "Each cited passage is checked against what the search actually returned in this dive, so a made-up source can't get through.",
      sourcesNone:
        "There is nothing to check, because the answer says it doesn't know.",
      seabed:
        "The server finished in {t}. You just watched it about {k}× slower, one step at a time.",
      seabedSkipped: "You skipped ahead. The server finished in {t}.",
      calledOff: "The run ended early, so there is no seabed this time.",
      error: "The server stopped the run. The reason is below.",
    },
    logLabel: "Dive log",
    seabed: {
      profileLabel: "Dive profile: {n} steps down to {m} in {t}.",
      axisNote: "Depth axis in ocean zones",
      earlyEnd: "The run ended early, so there is no seabed this time.",
      receipt: {
        total: "total",
        calls: "model calls",
        tokens: "tokens",
        cost: "cost",
        outcome: "outcome",
      },
    },
    hud: {
      label: "Live from the server",
      from: "From the server",
      serverTime: "server time",
      calls: "Model calls",
      tokens: ["Tokens", " in / out"],
      cost: "Cost",
      firstWord: ["First word", " after"],
    },
    air: "{t} °C air",
    follow: "Follow the dive",
    back: {
      title: "Back from the seabed",
      answered: "Back from the seabed. The answer is ready.",
      empty: "Back from the seabed. The agent found nothing in the notes.",
    },
    surface: "Surface",
    replay: "Replay the dive",
    playback: {
      label: "Dive playback",
      dive: "Dive {n}",
      pause: "Pause",
      resume: "Resume",
      speed: "Playback speed",
      skip: "Skip to the answer",
      serverRunning: "The server is answering… {t}",
      serverDone:
        "The server finished in {t}. You're watching it slowed down, one step at a time.",
    },
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
      requestCarried: "השאלה שלך הגיעה לשרת, ואיתה {n} הודעות קודמות",
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
      resultsGood: "{g} מתוך {n} קטעים קשורים לשאלה",
      resultsNone: "אף אחד מ־{n} הקטעים לא קשור לשאלה",
      writing: "כתיבה",
      writingFrom: "כותבים את התשובה מתוך {n} קטעים",
      writingNone: "כותבים תשובה בלי קטעים לשימוש",
      decision: "החלטה",
      decisionAnswer: "התשובה מגובה ברשימות, אז היא יוצאת",
      decisionNoInfo: "אין מספיק ברשימות, אז הסוכן אומר שהוא לא יודע",
      sources: "מקורות",
      sourcesChecked: "{m} מתוך {n} מקורות תואמים לחיפוש של הצלילה הזו",
      sourcesNone: "אין מקורות לבדוק",
      done: "סיום",
      seabedAnswered: "קרקעית · התשובה נמסרה",
      seabedNoInfo: "קרקעית · אין על זה ברשימות",
      stopped: "נעצר",
      calledOff: "הצלילה בוטלה",
      error: "שגיאה",
      errorTitle: "משהו השתבש בשרת",
    },
    say: {
      request:
        "היא בדיוק יצאה מהדפדפן שלך בחיבור זורם. שום דבר ממנה לא נשמר: לא השאלה ולא התשובה.",
      requestCarried:
        "הדפדפן שלח שוב את כל השיחה. השרת לא זוכר כלום בין שאלות, וכך הסוכן יודע למה ”אלה“ מתכוון.",
      guard:
        "לפני שמודל כלשהו רץ, השרת עושה בדיקות זולות: האם זה אדם, האם זה בתוך מגבלת הקצב ותקציב היום, והאם ההודעה באורך סביר?",
      guardBlocked: "אחת הבדיקות נכשלה, אז שום מודל לא רץ ושום דבר לא נוצל.",
      cacheHit:
        "השאלה הזו נענתה לאחרונה, אז התשובה השמורה חוזרת ושום מודל לא רץ.",
      cacheMiss: "עדיין אין תשובה שמורה לשאלה הזו, אז המודל עונה עליה מחדש.",
      llmFirst:
        "המודל קורא את השאלה שלך יחד עם מה שהחיפוש מצא, ואז בוחר צעד: לענות עכשיו, או להשתמש קודם בכלי נוסף.",
      llmFirstCarried:
        "המודל קורא את השאלה שלך יחד עם ההודעות הקודמות ומה שהחיפוש מצא, ואז בוחר צעד: לענות עכשיו, או להשתמש קודם בכלי נוסף.",
      llmRound:
        "סבב {n} של לולאת הסוכן. עכשיו יש למודל את תוצאות החיפוש, והוא מחליט שוב.",
      choseTool: "הוא לא יכול לענות מהזיכרון, אז הוא קורא לכלי: {tool}.",
      choseAnswer: "יש לו מה שהוא צריך, אז הוא כותב את התשובה הסופית.",
      choseText: "הוא ענה בטקסט חופשי, בלי התשובה הנבדקת.",
      unfinished: "הקריאה נעצרה לפני שהמודל החליט.",
      search:
        "השאלה שלך הופכת לחיפוש: {q}. הוא רץ כחיפוש לפי משמעות וכחיפוש מילות מפתח בבת אחת, ושתי רשימות התוצאות מתמזגות.",
      searchCarried:
        "המודל הפך את שאלת ההמשך שלך לחיפוש מדויק: {q}. הוא רץ כחיפוש לפי משמעות וכחיפוש מילות מפתח בבת אחת, ושתי רשימות התוצאות מתמזגות.",
      searchMore:
        "התוצאות הראשונות לא כיסו חלק מהשאלה, אז המודל מחפש שוב: {q}. שוב חיפוש לפי משמעות וחיפוש מילות מפתח, ממוזגים.",
      tool: "המודל קורא ל־{tool} כדי לקרוא את זה ישר מהנתונים של אליהו, בלי חיפוש.",
      results:
        "כל קטע מקבל ציון רלוונטיות. רק קטעים מעל קו ה־{t} מגיעים למודל. השאר שוקעים, והמודל לא רואה אותם. ציון גבוה אומר שהקטע בנושא, לא שהוא התשובה: המודל קורא אותם ומחליט מה עונה על השאלה.",
      writingFrom:
        "המודל כותב רק מתוך הקטעים שעברו את הסף. התשובה זורמת בחזרה מילה אחר מילה. תקראו אותה בקרקעית.",
      writingNone:
        "בלי שום דבר לעמוד עליו, המודל מתבקש לומר שהוא לא יודע במקום לנחש.",
      decisionAnswer:
        "הבדיקה הזו היא קוד, לא המודל. הקטע הטוב ביותר קיבל {s} מול סף של {t}, והתשובה מצטטת את מה שהיא משתמשת בו.",
      decisionNoInfo:
        "הבדיקה הזו היא קוד, לא המודל. שום דבר לא עבר את {t}, אז במקום לנחש, הסוכן אומר שהוא לא יודע.",
      sources:
        "כל קטע מצוטט נבדק מול מה שהחיפוש באמת החזיר בצלילה הזו, כך שמקור מומצא לא יכול לעבור.",
      sourcesNone: "אין מה לבדוק, כי התשובה אומרת שהוא לא יודע.",
      seabed: "השרת סיים ב־{t}. צפיתם בזה בערך פי {k} לאט יותר, שלב אחר שלב.",
      seabedSkipped: "דילגתם קדימה. השרת סיים ב־{t}.",
      calledOff: "הריצה נגמרה מוקדם, אז הפעם אין קרקעית.",
      error: "השרת עצר את הריצה. הסיבה מופיעה למטה.",
    },
    logLabel: "יומן הצלילה",
    seabed: {
      profileLabel: "פרופיל הצלילה: {n} שלבים עד עומק {m} תוך {t}.",
      axisNote: "ציר העומק לפי אזורי האוקיינוס",
      earlyEnd: "הריצה נגמרה מוקדם, אז הפעם אין קרקעית.",
      receipt: {
        total: "סה״כ",
        calls: "קריאות למודל",
        tokens: "טוקנים",
        cost: "עלות",
        outcome: "תוצאה",
      },
    },
    hud: {
      label: "בזמן אמת מהשרת",
      from: "מהשרת",
      serverTime: "זמן שרת",
      calls: "קריאות למודל",
      tokens: ["טוקנים", " קלט / פלט"],
      cost: "עלות",
      firstWord: ["מילה ראשונה", " אחרי"],
    },
    air: "{t} °C באוויר",
    follow: "לעקוב אחרי הצלילה",
    back: {
      title: "חזרנו מהקרקעית",
      answered: "חזרנו מהקרקעית. התשובה מוכנה.",
      empty: "חזרנו מהקרקעית. הסוכן לא מצא דבר ברשימות.",
    },
    surface: "חזרה לפני המים",
    replay: "לצלול שוב",
    playback: {
      label: "הצגת הצלילה",
      dive: "צלילה {n}",
      pause: "השהיה",
      resume: "המשך",
      speed: "מהירות הצגה",
      skip: "דילוג לתשובה",
      serverRunning: "השרת עונה… {t}",
      serverDone: "השרת סיים תוך {t}. מה שרואים כאן מואט, צעד אחר צעד.",
    },
  },
};

/** The seabed's dive profile, in SVG units; `headroom` keeps the deepest point off the floor. */
export const PROFILE_CHART = {
  width: 640,
  height: 230,
  pad: { start: 64, end: 12, top: 12, bottom: 28 },
  headroom: 1.04,
  labelGap: 8,
  labelRise: 3,
} as const;

export const PROFILE_LEGEND: [StepKind, StageId][] = [
  ["guard", "guard"],
  ["llm", "llm"],
  ["tool", "tool"],
  ["gen", "stream"],
];
