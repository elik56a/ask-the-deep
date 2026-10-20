import { ChatInput } from "#/components/ChatInput";
import { MessageBubble } from "#/components/MessageBubble";
import { StepIcon } from "#/components/StepIcon";
import { SuggestedQuestions } from "#/components/SuggestedQuestions";
import { Switch } from "#/components/ui/switch";
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
  stayAtSurface: boolean;
  onStayAtSurface: (stay: boolean) => void;
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
  stayAtSurface,
  onStayAtSurface,
}: ChatProps) {
  const copy = CHAT_COPY[lang];
  const thinking = waiting && messages.at(-1)?.role === "user";
  return (
    <section
      aria-label={copy.agentLabel}
      className="flex min-h-0 flex-col gap-3.5 rounded-3xl border border-accent/34 bg-surface/93 p-4.5 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_8%,transparent),0_30px_80px_-24px_var(--color-case)] backdrop-blur-lg"
    >
      {messages.length === 0 && (
        <h2 className="font-display text-title italic leading-[1.05] rtl:not-italic">
          {copy.consoleTitle}
        </h2>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-muted text-sm">
          <span
            aria-hidden="true"
            className="size-1.75 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]"
          />
          {copy.agentLabel}
        </p>
        <label
          htmlFor="stay-at-surface"
          className="flex min-h-9 cursor-pointer items-center gap-2.5 text-muted text-sm has-data-checked:text-text"
        >
          <Switch
            id="stay-at-surface"
            checked={stayAtSurface}
            onCheckedChange={onStayAtSurface}
          />
          {copy.stayAtSurface}
        </label>
      </div>
      {messages.length === 0 ? (
        <SuggestedQuestions lang={lang} disabled={!canSend} onPick={onSend} />
      ) : (
        <ol className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain">
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
      <ChatInput lang={lang} disabled={!canSend} onSend={onSend} />
    </section>
  );
}
