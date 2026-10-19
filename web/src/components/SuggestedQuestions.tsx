import { ArrowIcon } from "#/components/ArrowIcon";
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
    <section aria-label={copy.suggestionsLabel} className="mt-2">
      <ul className="flex flex-col gap-2">
        {copy.suggestions.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-strong bg-sunk px-4 py-3.5 text-start font-medium transition-[border-color,background-color,scale] duration-150 ease-out hover:border-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            >
              <span dir="auto">{question}</span>
              <span className="text-accent">
                <ArrowIcon />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
