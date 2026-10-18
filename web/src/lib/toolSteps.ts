import type { ToolCalled, ToolCompleted } from "#/lib/events.gen";

export type Lang = "he" | "en";

interface StepCopy {
  running: (args: Record<string, string>) => string;
  done: (event: ToolCompleted) => string;
}

const count = (n: number, one: string, many: string) =>
  n === 1 ? one : many.replace("{n}", String(n));

const STEPS: Record<Lang, Record<string, StepCopy>> = {
  en: {
    search_knowledge: {
      running: (args) => `Searching Eliyahu's knowledge for "${args.query}"…`,
      done: ({ result_count: n }) =>
        n === 0
          ? "Nothing relevant found"
          : count(n, "Found 1 relevant passage", "Found {n} relevant passages"),
    },
    list_projects: {
      running: () => "Looking through his projects…",
      done: ({ result_count: n }) =>
        count(n, "Found 1 project", "Found {n} projects"),
    },
    get_project: {
      running: (args) => `Opening the "${args.name}" project…`,
      done: ({ ok }) => (ok ? "Got the project details" : "Project not found"),
    },
    github_activity: {
      running: () => "Checking his latest GitHub activity…",
      done: ({ ok, result_count: n }) =>
        ok
          ? count(n, "Found 1 recent repo", "Found {n} recent repos")
          : "GitHub is unavailable right now",
    },
    contact_info: {
      running: () => "Getting contact details…",
      done: () => "Ready",
    },
  },
  he: {
    search_knowledge: {
      running: (args) => `מחפש במידע על אליהו: "${args.query}"…`,
      done: ({ result_count: n }) =>
        n === 0
          ? "לא נמצא מידע רלוונטי"
          : count(n, "נמצא קטע רלוונטי אחד", "נמצאו {n} קטעים רלוונטיים"),
    },
    list_projects: {
      running: () => "עובר על הפרויקטים שלו…",
      done: ({ result_count: n }) =>
        count(n, "נמצא פרויקט אחד", "נמצאו {n} פרויקטים"),
    },
    get_project: {
      running: (args) => `פותח את הפרויקט "${args.name}"…`,
      done: ({ ok }) => (ok ? "התקבלו פרטי הפרויקט" : "הפרויקט לא נמצא"),
    },
    github_activity: {
      running: () => "בודק פעילות אחרונה ב-GitHub…",
      done: ({ ok, result_count: n }) =>
        ok
          ? count(n, "נמצא מאגר אחרון אחד", "נמצאו {n} מאגרים אחרונים")
          : "GitHub לא זמין כרגע",
    },
    contact_info: {
      running: () => "מביא פרטי יצירת קשר…",
      done: () => "מוכן",
    },
  },
};

const FALLBACK: Record<Lang, { running: string; done: string }> = {
  en: { running: "Working…", done: "Done" },
  he: { running: "עובד על זה…", done: "הסתיים" },
};

export function toolStepLabel(
  event: ToolCalled | ToolCompleted,
  lang: Lang,
): string {
  const copy = STEPS[lang][event.tool];
  if (event.type === "tool.called") {
    return copy ? copy.running(event.args) : FALLBACK[lang].running;
  }
  return copy ? copy.done(event) : FALLBACK[lang].done;
}
