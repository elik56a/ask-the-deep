import { useRef } from "react";
import { ChatHeader } from "#/components/ChatHeader";
import { ChatInput } from "#/components/ChatInput";
import { ChatPill } from "#/components/ChatPill";
import { SuggestedQuestions } from "#/components/SuggestedQuestions";
import { ThreadTurn } from "#/components/ThreadTurn";
import { CHAT_COPY } from "#/constants/chat.constants";
import { useRevealTurn } from "#/hooks/useRevealTurn";
import type { ChatMessage, ChatState } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";
import type { ThreadTurn as Turn } from "#/types/thread.types";
import { messageText } from "#/utils/chat.utils";
import { threadTurns } from "#/utils/thread.utils";

interface ChatProps {
  lang: Lang;
  messages: ChatMessage[];
  canSend: boolean;
  failed: boolean;
  onSend: (question: string) => void;
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
  stayAtSurface: boolean;
  onStayAtSurface: (stay: boolean) => void;
  /** At the seabed; null at the surface. */
  state: ChatState | null;
  onStateChange: (state: ChatState) => void;
  onSurface: () => void;
  onReread: () => void;
  onLand: () => void;
  /** The dive whose answer just came back. */
  freshDive: number | null;
  onWatch: (turn: Turn) => void;
  onNewConversation: () => void;
}

export function Chat({
  lang,
  messages,
  canSend,
  failed,
  onSend,
  focusChunk,
  onFocusChunk,
  stayAtSurface,
  onStayAtSurface,
  state,
  onStateChange,
  onSurface,
  onReread,
  onLand,
  freshDive,
  onWatch,
  onNewConversation,
}: ChatProps) {
  const copy = CHAT_COPY[lang];
  const turns = threadTurns(messages);
  const thread = useRef<HTMLOListElement>(null);
  useRevealTurn(thread, turns.length);
  return (
    <>
      {state === "pill" && (
        <ChatPill lang={lang} onOpen={() => onStateChange("side")} />
      )}
      {/* Folded, not unmounted: the thread keeps its scroll and a typed answer never retypes */}
      <section
        hidden={state === "pill"}
        aria-label={copy.agentLabel}
        data-state={state ?? undefined}
        className="flex min-h-0 flex-col gap-3.5 rounded-3xl border border-accent/34 bg-surface/94 p-4.5 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_8%,transparent),0_30px_80px_-24px_var(--color-case)] backdrop-blur-lg pointer-coarse:backdrop-blur-none data-state:border-accent/60 data-state:shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-accent)_10%,transparent),0_0_80px_-20px_color-mix(in_oklab,var(--color-accent)_40%,transparent),0_30px_80px_-24px_var(--color-case)] max-lg:data-state:rounded-b-none max-lg:data-state:rounded-t-[22px] max-lg:data-state:border-b-0 max-lg:data-state:pb-[calc(14px+env(safe-area-inset-bottom,0px))]"
      >
        {turns.length === 0 && (
          <h2 className="font-bold font-display font-stretch-expanded text-2xl leading-[1.1] tracking-[-0.02em]">
            {copy.consoleTitle}
          </h2>
        )}
        <ChatHeader
          lang={lang}
          state={state}
          talked={turns.length > 0}
          stayAtSurface={stayAtSurface}
          onStayAtSurface={onStayAtSurface}
          onNewConversation={onNewConversation}
          onSurface={onSurface}
          onReread={onReread}
          onLand={onLand}
          onMinimize={() => onStateChange("pill")}
        />
        {turns.length === 0 ? (
          <SuggestedQuestions lang={lang} disabled={!canSend} onPick={onSend} />
        ) : (
          <>
            <ol
              ref={thread}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: the thread scrolls on its own, so keyboard users need a tab stop to scroll it (axe scrollable-region-focusable)
              tabIndex={0}
              aria-label={copy.threadLabel}
              className="flex min-h-0 flex-auto flex-col gap-5.5 overflow-y-auto overscroll-contain px-1 pt-1.5 [scrollbar-width:thin] [&>:first-child]:mt-auto"
            >
              {turns.map((turn) => (
                <ThreadTurn
                  key={turn.question.id}
                  turn={turn}
                  lang={lang}
                  fresh={turn.dive === freshDive}
                  onWatch={onWatch}
                  focusChunk={focusChunk}
                  onFocusChunk={onFocusChunk}
                />
              ))}
            </ol>
            <SuggestedQuestions
              lang={lang}
              disabled={!canSend}
              onPick={onSend}
              asked={turns.map((turn) => messageText(turn.question))}
            />
          </>
        )}
        {failed && (
          <p role="alert" className="text-muted text-sm">
            {copy.genericError}
          </p>
        )}
        <ChatInput lang={lang} disabled={!canSend} onSend={onSend} />
      </section>
    </>
  );
}
