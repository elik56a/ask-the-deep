import { CHAT_COPY } from "#/constants/chat.constants";
import type { Lang } from "#/types/i18n.types";

interface SuggestedQuestionsProps {
  lang: Lang;
  disabled: boolean;
  onPick: (question: string) => void;
}

export function SuggestedQuestions({
  lang,
  disabled,
  onPick,
}: SuggestedQuestionsProps) {
  const copy = CHAT_COPY[lang];
  return (
    <section aria-label={copy.suggestionsLabel}>
      <ul className="flex flex-wrap gap-2">
        {copy.suggestions.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
