import { MessageCircle } from "lucide-react";
import { Avatar } from "#/components/Avatar";
import { CHAT_COPY } from "#/constants/chat.constants";
import type { Lang } from "#/types/i18n.types";

interface ChatPillProps {
  lang: Lang;
  onOpen: () => void;
}

/** The chat folded while the visitor rereads the dive; it opens a compact panel in place. */
export function ChatPill({ lang, onOpen }: ChatPillProps) {
  const copy = CHAT_COPY[lang];
  return (
    <section
      aria-label={copy.agentLabel}
      className="glass rounded-full border-accent/45 p-1 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_7%,transparent),0_0_28px_-8px_color-mix(in_oklab,var(--color-accent)_45%,transparent),0_18px_40px_-16px_var(--color-case)] transition-[border-color] duration-200 ease-out hover:border-accent"
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full py-1 ps-1 pe-3.5 font-semibold text-sm tracking-[0.01em] outline-glow transition-transform duration-120 ease-out focus-visible:outline-2 active:scale-97"
      >
        <Avatar label={copy.agentAvatar} badge={false} live />
        {copy.openChat}
        <MessageCircle
          aria-hidden="true"
          className="size-3.75 flex-none text-glow transition-transform duration-200 ease-out group-hover:scale-112"
        />
      </button>
    </section>
  );
}
