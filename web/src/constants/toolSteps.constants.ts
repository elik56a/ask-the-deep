import type { Lang } from "#/types/i18n.types";
import type { ToolStepCopy } from "#/types/toolSteps.types";

export const TOOL_STEPS: Record<Lang, Partial<Record<string, ToolStepCopy>>> = {
  en: {
    search_knowledge: {
      running: `Searching Eliyahu's knowledge for "{query}"…`,
      done: "Found {n} relevant passages",
      doneOne: "Found 1 relevant passage",
      doneNone: "Nothing relevant found",
    },
    list_projects: {
      running: "Looking through his projects…",
      done: "Found {n} projects",
      doneOne: "Found 1 project",
    },
    get_project: {
      running: `Opening the "{name}" project…`,
      done: "Got the project details",
      failed: "Project not found",
    },
    github_activity: {
      running: "Checking his latest GitHub activity…",
      done: "Found {n} recent repos",
      doneOne: "Found 1 recent repo",
      failed: "GitHub is unavailable right now",
    },
    contact_info: {
      running: "Getting contact details…",
      done: "Ready",
    },
  },
  he: {
    search_knowledge: {
      running: `מחפש במידע על אליהו: "{query}"…`,
      done: "נמצאו {n} קטעים רלוונטיים",
      doneOne: "נמצא קטע רלוונטי אחד",
      doneNone: "לא נמצא מידע רלוונטי",
    },
    list_projects: {
      running: "עובר על הפרויקטים שלו…",
      done: "נמצאו {n} פרויקטים",
      doneOne: "נמצא פרויקט אחד",
    },
    get_project: {
      running: `פותח את הפרויקט "{name}"…`,
      done: "התקבלו פרטי הפרויקט",
      failed: "הפרויקט לא נמצא",
    },
    github_activity: {
      running: "בודק פעילות אחרונה ב-GitHub…",
      done: "נמצאו {n} מאגרים אחרונים",
      doneOne: "נמצא מאגר אחרון אחד",
      failed: "GitHub לא זמין כרגע",
    },
    contact_info: {
      running: "מביא פרטי יצירת קשר…",
      done: "מוכן",
    },
  },
};

export const TOOL_STEP_FALLBACK: Record<Lang, ToolStepCopy> = {
  en: { running: "Working…", done: "Done" },
  he: { running: "עובד על זה…", done: "הסתיים" },
};
