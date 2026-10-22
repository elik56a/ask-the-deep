import { AnswerMarkdown } from "#/components/AnswerMarkdown";
import { Avatar } from "#/components/Avatar";
import { SourceChips } from "#/components/SourceChips";
import { Button } from "#/components/ui/button";
import { CHAT_COPY } from "#/constants/chat.constants";
import { useTypedText } from "#/hooks/useTypedText";
import type { Lang } from "#/types/i18n.types";
import type { ThreadTurn as Turn } from "#/types/thread.types";
import {
  messageCitations,
  messageError,
  messageEvents,
  messageText,
} from "#/utils/chat.utils";
import { turnMeta } from "#/utils/thread.utils";
import { buildTrace } from "#/utils/trace.utils";

interface ThreadTurnProps {
  turn: Turn;
  lang: Lang;
  /** The turn just answered: its card glows and the answer types out. */
  fresh: boolean;
  onWatch: (turn: Turn) => void;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function ThreadTurn({
  turn,
  lang,
  fresh,
  onWatch,
  focusChunk,
  onFocusChunk,
}: ThreadTurnProps) {
  const copy = CHAT_COPY[lang];
  const events = turn.answer ? messageEvents(turn.answer) : [];
  const trace = buildTrace(events);
  const text = turn.answer ? messageText(turn.answer) : "";
  const error = turn.answer ? messageError(turn.answer) : undefined;
  const done = trace.outcome !== null;
  const typed = useTypedText(text, fresh && done);
  const typing = typed.length < text.length;
  const citations = messageCitations(events);

  return (
    <li
      data-new={fresh || undefined}
      className="group flex flex-col gap-1.5 rounded-[18px] px-3.5 pt-3.5 pb-0.5"
    >
      <div className="flex items-end justify-end gap-2.5">
        <p
          dir="auto"
          className="max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-ee-md bg-haze px-3.5 py-2.25 font-medium text-[0.9375rem] text-ink leading-[1.45]"
        >
          {messageText(turn.question)}
        </p>
        <Avatar />
      </div>
      {done || error ? (
        <>
          <div className="mt-3.5 flex items-start gap-2.5">
            <Avatar label={copy.agentAvatar} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-line-strong bg-text/8 px-4 py-3.5 group-data-new:border-glow/70 group-data-new:shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-glow)_50%,transparent)]">
              {text && (
                <p className="font-mono text-[11px] text-glow uppercase leading-none tracking-[0.12em]">
                  {copy.answerLabel}
                </p>
              )}
              <div
                dir="auto"
                className="text-pretty text-[0.9375rem] leading-[1.6] [&>:is(p,ul,ol)+:is(p,ul,ol)]:mt-2.5 [&>p:last-of-type]:inline"
              >
                {text && <AnswerMarkdown text={typed} />}
                {typing && (
                  <span
                    aria-hidden="true"
                    className="ms-0.5 inline-block h-[1.05em] w-0.5 animate-pulse bg-glow align-[-0.15em]"
                  />
                )}
                {error && !text && (
                  <span role="alert" className="text-muted">
                    {copy.errors[error] ?? copy.genericError}
                  </span>
                )}
              </div>
            </div>
          </div>
          {citations.length > 0 && (
            <p className="mt-3 -mb-0.5 font-medium font-mono text-[10px] text-muted uppercase leading-[1.2] tracking-[0.1em]">
              {copy.sourcesUsed}
            </p>
          )}
          <SourceChips
            citations={citations}
            focusChunk={focusChunk}
            onFocusChunk={onFocusChunk}
          />
          {done && (
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-muted text-xs leading-[1.4]">
              <span>
                {copy.meta.dive}{" "}
                <b className="font-medium text-text">{turn.dive}</b> ·{" "}
                {turnMeta(copy.meta.stats, trace)}
              </span>
              <Button
                variant="link"
                onClick={() => onWatch(turn)}
                className="-my-1.5 h-8 px-1.5 font-sans text-[0.8125rem] text-glow hover:text-text hover:no-underline"
              >
                {copy.watchAgain}
              </Button>
            </p>
          )}
        </>
      ) : (
        <p className="inline-flex items-center gap-2.5 text-muted text-sm">
          <span className="inline-block size-3 flex-none animate-spin rounded-full border-2 border-line-strong border-t-glow [animation-duration:0.8s] motion-reduce:animate-none" />
          {copy.pending}
        </p>
      )}
    </li>
  );
}
