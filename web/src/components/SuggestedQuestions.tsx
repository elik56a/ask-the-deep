import { ArrowRight } from "lucide-react";
import { Button } from "#/components/ui/button";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { Lang } from "#/types/i18n.types";

interface SuggestedQuestionsProps {
  lang: Lang;
  disabled: boolean;
  onPick: (question: string) => void;
  /** Once the conversation has started: the unasked ones as one sideways row of small pills. */
  asked?: string[];
}

export function SuggestedQuestions({
  lang,
  disabled,
  onPick,
  asked,
}: SuggestedQuestionsProps) {
  const copy = CHAT_COPY[lang];
  const open = copy.suggestions.filter(
    (question) => !asked?.includes(question),
  );
  if (asked && open.length === 0) return null;
  return (
    <section
      aria-label={copy.suggestionsLabel}
      className={
        asked ? "-mx-4.5 flex-none border-line border-t px-4.5 pt-3" : undefined
      }
    >
      <ul
        className={
          asked
            ? "-mx-4.5 flex gap-1.5 overflow-x-auto px-4.5 [mask-image:linear-gradient(90deg,transparent,black_18px,black_calc(100%-18px),transparent)] [scrollbar-width:none]"
            : "flex flex-col gap-2 [@media(max-height:760px)]:[&>li:nth-child(n+3)]:hidden"
        }
      >
        {open.map((question) => (
          <li key={question} className={asked ? "flex-none" : undefined}>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => onPick(question)}
              className={
                asked
                  ? "h-auto min-h-8 gap-1.5 rounded-full pointer-coarse:min-h-11 border-line bg-text/6 py-1 ps-3 pe-2 font-medium text-[0.8125rem] hover:border-accent hover:bg-accent/14 [&_svg]:size-3.25"
                  : "h-auto min-h-12 w-full justify-between gap-3 whitespace-normal rounded-[14px] border-line bg-text/6 px-3.5 py-3 text-start font-medium text-[0.9375rem] hover:border-accent hover:bg-accent/14"
              }
            >
              <span dir="auto">{question}</span>
              <span className="text-accent">
                <ArrowRight
                  aria-hidden="true"
                  className="size-4.5 flex-none rtl:-scale-x-100"
                />
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
