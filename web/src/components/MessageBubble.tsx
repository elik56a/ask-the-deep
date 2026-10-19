import { ChatSteps } from "#/components/ChatSteps";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";
import { messageError, messageEvents, messageText } from "#/utils/chat.utils";
import { chatSteps } from "#/utils/chatSteps.utils";
import { buildTrace } from "#/utils/trace.utils";

interface MessageBubbleProps {
  message: ChatMessage;
  lang: Lang;
}

export function MessageBubble({ message, lang }: MessageBubbleProps) {
  const copy = CHAT_COPY[lang];
  const text = messageText(message);

  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div
          dir="auto"
          className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-accent px-4 py-2.5 font-medium text-on-accent"
        >
          {text}
        </div>
      </li>
    );
  }

  const events = messageEvents(message);
  const trace = buildTrace(events);
  const error = messageError(message);
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
          dir="auto"
          className="whitespace-pre-wrap text-pretty rounded-2xl rounded-es-md border border-line-strong bg-sunk px-4 py-3 leading-relaxed"
        >
          {text}
          {text && trace.outcome === null && (
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
      )}
    </li>
  );
}
