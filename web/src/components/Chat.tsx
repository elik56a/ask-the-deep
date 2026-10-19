import { ChatInput } from "#/components/ChatInput";
import { MessageBubble } from "#/components/MessageBubble";
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
}

export function Chat({
  lang,
  messages,
  waiting,
  canSend,
  failed,
  onSend,
}: ChatProps) {
  const copy = CHAT_COPY[lang];
  return (
    <section className="flex flex-col gap-4">
      <p className="w-fit rounded-full border border-line px-3 py-1 text-muted text-xs">
        {copy.agentLabel}
      </p>
      {messages.length === 0 ? (
        <SuggestedQuestions lang={lang} disabled={!canSend} onPick={onSend} />
      ) : (
        <ol className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} lang={lang} />
          ))}
        </ol>
      )}
      {waiting && <p className="text-muted text-sm">{copy.thinking}</p>}
      {failed && (
        <p role="alert" className="text-muted text-sm">
          {copy.genericError}
        </p>
      )}
      <ChatInput lang={lang} disabled={!canSend} onSend={onSend} />
    </section>
  );
}
