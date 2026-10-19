import { CHAT_COPY } from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";
import { messageError, messageText } from "#/utils/chat.utils";

interface MessageBubbleProps {
  message: ChatMessage;
  lang: Lang;
}

export function MessageBubble({ message, lang }: MessageBubbleProps) {
  const copy = CHAT_COPY[lang];
  const text = messageText(message);
  const error = messageError(message);
  const fromUser = message.role === "user";
  return (
    <li className={fromUser ? "flex justify-end" : "flex justify-start"}>
      <div
        dir="auto"
        className={
          fromUser
            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-accent px-4 py-2 text-on-accent"
            : "max-w-[85%] whitespace-pre-wrap rounded-2xl border border-line bg-surface px-4 py-2"
        }
      >
        {text}
        {error && !text && (
          <span role="alert" className="text-muted">
            {copy.errors[error] ?? copy.genericError}
          </span>
        )}
      </div>
    </li>
  );
}
