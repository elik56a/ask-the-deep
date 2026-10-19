import { ChatInput } from "#/components/ChatInput";
import { MessageBubble } from "#/components/MessageBubble";
import { StepIcon } from "#/components/StepIcon";
import { SuggestedQuestions } from "#/components/SuggestedQuestions";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";

interface ChatProps {
  lang: Lang;
  messages: ChatMessage[];
  waiting: boolean;
  canSend: boolean;
  failed: boolean;
  onSend: (question: string) => void;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function Chat({
  lang,
  messages,
  waiting,
  canSend,
  failed,
  onSend,
  focusChunk,
  onFocusChunk,
}: ChatProps) {
  const copy = CHAT_COPY[lang];
  const thinking = waiting && messages.at(-1)?.role === "user";
  return (
    <section
      aria-label={copy.agentLabel}
      className="flex min-h-150 flex-col gap-5 rounded-2xl border border-line-strong bg-linear-to-b from-accent/6 via-30% via-surface to-surface p-6"
    >
      <p className="flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1 text-muted text-sm">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
        {copy.agentLabel}
      </p>
      {messages.length === 0 ? (
        <div className="flex flex-col gap-3.5 pt-6">
          <h2 className="text-balance font-bold text-display leading-[1.05] tracking-tight">
            {copy.introTitle}
          </h2>
          <p className="max-w-[54ch] text-pretty text-muted">
            {copy.introBody}
          </p>
          <SuggestedQuestions lang={lang} disabled={!canSend} onPick={onSend} />
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              lang={lang}
              focusChunk={focusChunk}
              onFocusChunk={onFocusChunk}
            />
          ))}
        </ol>
      )}
      {thinking && (
        <p className="flex items-center gap-2.5 text-muted text-sm">
          <span className="grid size-4 place-items-center">
            <StepIcon state="running" />
          </span>
          {copy.thinking}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-muted text-sm">
          {copy.genericError}
        </p>
      )}
      <div className="mt-auto">
        <ChatInput lang={lang} disabled={!canSend} onSend={onSend} />
      </div>
    </section>
  );
}
