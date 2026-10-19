import { ArrowIcon } from "#/components/ArrowIcon";
import { Button } from "#/components/ui/button";
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
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="h-auto w-full justify-between gap-3 whitespace-normal rounded-xl bg-sunk px-4 py-3.5 text-start text-base hover:border-accent hover:bg-accent/10"
            >
              <span dir="auto">{question}</span>
              <span className="text-accent">
                <ArrowIcon />
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
