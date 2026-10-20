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
    <section aria-label={copy.suggestionsLabel}>
      <ul className="flex flex-col gap-2 [@media(max-height:760px)]:[&>li:nth-child(n+3)]:hidden">
        {copy.suggestions.map((question) => (
          <li key={question}>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal rounded-[14px] border-line bg-text/6 px-3.5 py-3 text-start font-medium text-[0.9375rem] hover:border-accent hover:bg-accent/14"
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
