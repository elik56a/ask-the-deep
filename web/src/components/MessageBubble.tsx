import { ChatSteps } from "#/components/ChatSteps";
import { SourceChips } from "#/components/SourceChips";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";
import {
  messageCitations,
  messageError,
  messageEvents,
  messageText,
} from "#/utils/chat.utils";
import { chatSteps } from "#/utils/chatSteps.utils";
import { buildTrace } from "#/utils/trace.utils";

interface MessageBubbleProps {
  message: ChatMessage;
  lang: Lang;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function MessageBubble({
  message,
  lang,
  focusChunk,
  onFocusChunk,
}: MessageBubbleProps) {
  const copy = CHAT_COPY[lang];
  const text = messageText(message);

  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div
          dir="auto"
          className="max-w-[88%] whitespace-pre-wrap rounded-[18px] rounded-ee-md bg-haze px-3.5 py-2.25 font-medium text-ink"
        >
          {text}
        </div>
      </li>
    );
  }

  const events = messageEvents(message);
  const trace = buildTrace(events);
  const error = messageError(message);
  const streaming = Boolean(text) && trace.outcome === null;
  return (
    <li className="flex max-w-[92%] flex-col gap-2.5">
      <ChatSteps
        steps={chatSteps(events, lang)}
        outcome={trace.outcome}
        totalMs={trace.totals.latencyMs ?? trace.lastMs}
        lang={lang}
      />
      {(text || error) && (
        <div
          data-live={streaming || undefined}
          className="flex flex-col gap-2 rounded-2xl border border-line-strong bg-text/8 px-4 py-3.5 transition-[border-color,box-shadow] duration-300 data-live:border-accent/70 data-live:shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-accent)_50%,transparent)]"
        >
          {text && (
            <p className="font-mono text-[11px] text-accent uppercase leading-none tracking-[0.12em]">
              {copy.answerLabel}
            </p>
          )}
          <div
            dir="auto"
            className="whitespace-pre-wrap text-pretty font-medium text-lg leading-[1.65]"
          >
            {text}
            {streaming && (
              <span
                aria-hidden="true"
                className="ms-0.5 inline-block h-[1.05em] w-0.5 animate-pulse bg-accent align-[-0.15em] motion-reduce:animate-none"
              />
            )}
            {error && !text && (
              <span role="alert" className="text-muted">
                {copy.errors[error] ?? copy.genericError}
              </span>
            )}
          </div>
        </div>
      )}
      <SourceChips
        citations={messageCitations(events)}
        focusChunk={focusChunk}
        onFocusChunk={onFocusChunk}
      />
    </li>
  );
}
