import type { ChatCopy } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";

// Mirror the API's MAX_HISTORY_MESSAGES, MAX_HISTORY_CHARS and MAX_INPUT_CHARS.
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_HISTORY_CHARS = 2000;
export const MAX_QUESTION_CHARS = 500;

export const MESSAGES_STORAGE_KEY = "portfolio-chat:messages";

export const HUMAN_CHECK_REQUIRED = "human_check_required";

// P3.12: each progress step stays on screen at least this long.
export const STEP_MIN_MS = 300;

export const CHAT_COPY: Record<Lang, ChatCopy> = {
  en: {
    agentLabel: "AI agent representing Eliyahu",
    showProcess: "Show the process",
    introTitle: "Ask about Eliyahu's work",
    introBody:
      "An AI agent answers from Eliyahu's own notes and cites its sources. You can watch every step it takes: each model call, search and score, with the time and cost.",
    steps: {
      checked: "Checked your question",
      blocked: "A safety check stopped this question",
      writing: "Writing the answer…",
      written: "Answer written",
      noInfo: "Not in Eliyahu's notes",
      stopped: "Stopped before finishing",
      doneIn: "Done in {s} s",
      showSteps: "Show steps",
      hideSteps: "Hide steps",
    },
    inputLabel: "Your question",
    placeholder: "Ask about Eliyahu's work, skills or projects…",
    send: "Send",
    suggestionsLabel: "Suggested questions",
    suggestions: [
      "What is Eliyahu working on now?",
      "What's his experience with AWS?",
      "Which projects has he built?",
      "How can I contact him?",
    ],
    thinking: "Thinking…",
    errors: {
      human_check_required: "Confirming you're human. Please ask again.",
      rate_limited: "Too many questions. Please wait a minute.",
      budget_exhausted:
        "The agent has reached its limit for now. Please come back later.",
      input_rejected: "That question is empty or too long.",
      timeout: "That took too long. Please try again.",
    },
    genericError: "Something went wrong. Please try again.",
  },
  he: {
    agentLabel: "סוכן AI שמייצג את אליהו",
    showProcess: "הצגת התהליך",
    introTitle: "שאלו על העבודה של אליהו",
    introBody:
      "סוכן AI עונה מתוך הרשימות של אליהו ומציין את המקורות. אפשר לראות כל צעד שהוא עושה: כל קריאה למודל, כל חיפוש וכל ציון, עם הזמן והעלות.",
    steps: {
      checked: "השאלה נבדקה",
      blocked: "בדיקת בטיחות עצרה את השאלה",
      writing: "כותב את התשובה…",
      written: "התשובה נכתבה",
      noInfo: "המידע לא נמצא ברשימות של אליהו",
      stopped: "נעצר לפני הסוף",
      doneIn: "הסתיים תוך {s} שניות",
      showSteps: "הצגת השלבים",
      hideSteps: "הסתרת השלבים",
    },
    inputLabel: "השאלה שלך",
    placeholder: "אפשר לשאול על העבודה, הכישורים או הפרויקטים של אליהו…",
    send: "שליחה",
    suggestionsLabel: "שאלות לדוגמה",
    suggestions: [
      "על מה אליהו עובד עכשיו?",
      "מה הניסיון שלו עם AWS?",
      "אילו פרויקטים הוא בנה?",
      "איך אפשר ליצור איתו קשר?",
    ],
    thinking: "חושב…",
    errors: {
      human_check_required: "מאמתים שמדובר באדם. אפשר לשאול שוב.",
      rate_limited: "יותר מדי שאלות. כדאי לחכות דקה.",
      budget_exhausted: "הסוכן הגיע למגבלה שלו כרגע. אפשר לחזור מאוחר יותר.",
      input_rejected: "השאלה ריקה או ארוכה מדי.",
      timeout: "זה לקח יותר מדי זמן. אפשר לנסות שוב.",
    },
    genericError: "משהו השתבש. אפשר לנסות שוב.",
  },
};
