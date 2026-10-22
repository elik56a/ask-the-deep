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

// The answer types out at the seabed at this pace per word.
export const TYPE_WORD_MS = 45;

export const CHAT_COPY: Record<Lang, ChatCopy> = {
  en: {
    agentLabel: "AI agent representing Eliyahu",
    stayAtSurface: "Stay at the surface",
    consoleTitle: "Ask the agent",
    answerLabel: "Answer",
    hideThread: "Hide the conversation",
    showThread: "Show the conversation",
    introTitle: ["Ask about ", "me", ""],
    introBody:
      "My AI agent answers from my own notes. Ask, and watch every step on the way down.",
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
    threadLabel: "Conversation",
    agentAvatar: "Eliyahu's AI agent",
    sourcesUsed: "Sources the answer used",
    meta: { dive: "Dive", stats: "{t} · {calls} model calls · {cost}" },
    watchAgain: "Watch again ↺",
    newConversation: "New conversation",
    pending: "The agent is answering at the surface…",
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
    stayAtSurface: "להישאר על פני המים",
    consoleTitle: "שאלו את הסוכן",
    answerLabel: "תשובה",
    hideThread: "הסתרת השיחה",
    showThread: "הצגת השיחה",
    introTitle: ["שאלו ", "עליי", ""],
    introBody:
      "סוכן ה-AI שלי עונה מתוך הרשימות שלי. שואלים, וצופים בכל צעד בדרך למטה.",
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
    threadLabel: "השיחה",
    agentAvatar: "סוכן ה-AI של אליהו",
    sourcesUsed: "המקורות שהתשובה נשענת עליהם",
    meta: { dive: "צלילה", stats: "{t} · {calls} קריאות למודל · {cost}" },
    watchAgain: "לצפות שוב ↺",
    newConversation: "שיחה חדשה",
    pending: "הסוכן עונה על פני המים…",
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
