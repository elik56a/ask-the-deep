import { useRef, useState } from "react";
import { ChatInput } from "#/components/ChatInput";
import { SuggestedQuestions } from "#/components/SuggestedQuestions";
import { ThreadTurn } from "#/components/ThreadTurn";
import { Button } from "#/components/ui/button";
import { Switch } from "#/components/ui/switch";
import { CHAT_COPY } from "#/constants/chat.constants";
import { useRevealTurn } from "#/hooks/useRevealTurn";
import type { ChatMessage } from "#/types/chat.types";
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
  /** A bottom sheet on small screens while diving, so the dive stays visible. */
  collapsible: boolean;
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
  collapsible,
  freshDive,
  onWatch,
  onNewConversation,
}: ChatProps) {
  const copy = CHAT_COPY[lang];
  const [collapsed, setCollapsed] = useState(false);
  const hidden = collapsible && collapsed;
  const turns = threadTurns(messages);
  const thread = useRef<HTMLOListElement>(null);
  useRevealTurn(thread, turns.length);
  return (
    <section
      aria-label={copy.agentLabel}
      className="flex min-h-0 flex-col gap-3.5 rounded-3xl border border-accent/34 bg-surface/93 p-4.5 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_8%,transparent),0_30px_80px_-24px_var(--color-case)] backdrop-blur-lg"
    >
      {messages.length === 0 && (
        <h2 className="font-bold font-display font-stretch-expanded text-2xl leading-[1.1] tracking-[-0.02em]">
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
          className="flex min-h-11 cursor-pointer items-center gap-2.5 text-muted text-sm has-data-checked:text-text"
        >
          <Switch
            id="stay-at-surface"
            checked={stayAtSurface}
            onCheckedChange={onStayAtSurface}
          />
          {copy.stayAtSurface}
        </label>
        {turns.length > 0 && (
          <Button
            variant="ghost"
            onClick={onNewConversation}
            className="min-h-10 text-muted hover:text-text"
          >
            {copy.newConversation}
          </Button>
        )}
        {collapsible && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-expanded={!collapsed}
            aria-label={collapsed ? copy.showThread : copy.hideThread}
            onClick={() => setCollapsed(!collapsed)}
            className="size-11 lg:hidden"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        )}
      </div>
      {turns.length === 0 ? (
        <SuggestedQuestions lang={lang} disabled={!canSend} onPick={onSend} />
      ) : (
        <>
          <ol
            ref={thread}
            hidden={hidden}
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
  );
}
