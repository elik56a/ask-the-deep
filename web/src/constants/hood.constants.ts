import type { HoodCopy, HoodStatus } from "#/types/hood.types";
import type { Lang } from "#/types/i18n.types";

export const PROCESS_STORAGE_KEY = "portfolio-chat:show-process";

export const HOOD_COPY: Record<Lang, HoodCopy> = {
  en: {
    status: {
      idle: "Waiting",
      running: "Working",
      answered: "Answered",
      no_information: "No information",
      blocked: "Blocked",
      error: "Error",
    },
    meters: {
      calls: "Model calls",
      tokens: "Tokens in / out",
      cost: "Cost (USD)",
      firstWord: "First word",
    },
    stages: {
      guard: "Guardrails",
      llm: "Model",
      tool: "Retrieval",
      stream: "Writing",
    },
    card: {
      cacheHit: "hit",
      cacheMiss: "miss",
      decidedTools: "Decided → call",
      decidedAnswer: "Decided → write the final answer",
      decidedText: "Decided → reply in plain text",
      fallback: "fallback model",
      rejected: "rejected: {reason}",
      results: "{n} results",
      reachModel: "{n} rise to the model",
      blockedBelow: "{n} sink below the gate",
      gate: "gate {t}",
      score: "Score {s}, gate {t}",
      promptCacheHit: "prompt cache hit",
      promptCacheMiss: "prompt cache miss",
      best: "best {s}",
      citationsMatched: "{m}/{n} cited passages were retrieved in this run",
      noCitations: "No sources to verify",
      prompt: "prompt {v}",
      history: "history · {n} messages",
      thinkingWith: "Thinking with {model}…",
      tokens: "{in} → {out} tokens",
      ok: "ok",
      wordsStreamed: "words streamed",
    },
  },
  he: {
    status: {
      idle: "ממתין",
      running: "עובד",
      answered: "נענה",
      no_information: "אין מידע",
      blocked: "נחסם",
      error: "שגיאה",
    },
    meters: {
      calls: "קריאות למודל",
      tokens: "טוקנים: קלט / פלט",
      cost: "עלות (USD)",
      firstWord: "מילה ראשונה",
    },
    stages: {
      guard: "בדיקות הגנה",
      llm: "מודל",
      tool: "שליפה",
      stream: "כתיבה",
    },
    card: {
      cacheHit: "נמצא",
      cacheMiss: "לא נמצא",
      decidedTools: "החלטה ← לקרוא ל־",
      decidedAnswer: "החלטה ← לכתוב את התשובה הסופית",
      decidedText: "החלטה ← לענות בטקסט חופשי",
      fallback: "מודל גיבוי",
      rejected: "נדחה: {reason}",
      results: "{n} תוצאות",
      reachModel: "{n} עולים למודל",
      blockedBelow: "{n} שוקעים מתחת לסף",
      gate: "סף {t}",
      score: "ציון {s}, סף {t}",
      promptCacheHit: "מטמון פרומפט: נמצא",
      promptCacheMiss: "מטמון פרומפט: לא נמצא",
      best: "הטוב ביותר {s}",
      citationsMatched: "{m}/{n} מהמקורות המצוטטים נשלפו בריצה הזו",
      noCitations: "אין מקורות לבדוק",
      prompt: "פרומפט {v}",
      history: "היסטוריה · {n} הודעות",
      thinkingWith: "חושב עם {model}…",
      tokens: "{in} → {out} טוקנים",
      ok: "תקין",
      wordsStreamed: "מילים נכתבו",
    },
  },
};

export const STATUS_DOT: Record<HoodStatus, string> = {
  idle: "bg-line-strong",
  running: "bg-accent animate-pulse motion-reduce:animate-none",
  answered: "bg-ok",
  no_information: "bg-warn",
  blocked: "bg-warn",
  error: "bg-warn",
};

/** The writing step's bars, as shares of a full line: the last one is a short line. */
export const WRITTEN_BARS = [1, 1, 0.6] as const;
