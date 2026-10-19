import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { HoodPanel } from "#/components/HoodPanel";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { ThemeSwitch } from "#/components/ThemeSwitch";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { useChatSession } from "#/hooks/useChatSession";
import { useFlip } from "#/hooks/useFlip";
import { useLang } from "#/hooks/useLang";
import { usePanelPresence } from "#/hooks/usePanelPresence";
import { useProcessPreference } from "#/hooks/useProcessPreference";
import { useSession } from "#/hooks/useSession";
import { useTheme } from "#/hooks/useTheme";
import { latestAnswer, messageEvents } from "#/utils/chat.utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { lang, toggle } = useLang();
  const theme = useTheme();
  const session = useSession();
  const chat = useChatSession(session.token, session.reset);
  const [focusChunk, setFocusChunk] = useState<string | null>(null);
  const answer = latestAnswer(chat.messages);
  const process = useProcessPreference();
  const panel = usePanelPresence(chat.messages.length > 0 && process.show);
  const chatColumn = useRef<HTMLDivElement>(null);
  useFlip(chatColumn, panel.mounted);
  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 pt-5">
        <h1 className="font-semibold text-xl tracking-tight">
          {PAGE_COPY[lang].title}
        </h1>
        <div className="flex gap-2">
          <ThemeSwitch
            lang={lang}
            theme={theme.theme}
            onToggle={theme.toggle}
          />
          <LangSwitch lang={lang} onToggle={toggle} />
        </div>
      </header>
      <main
        className={`mx-auto my-6 grid items-start gap-5 px-4 ${panel.mounted ? "max-w-7xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "max-w-3xl"}`}
      >
        <div
          ref={chatColumn}
          className={`flex min-w-0 flex-col gap-6 ${panel.mounted ? "lg:sticky lg:top-4" : ""}`}
        >
          <Chat
            lang={lang}
            messages={chat.messages}
            waiting={chat.waiting}
            canSend={Boolean(session.token) && !chat.busy}
            failed={chat.failed}
            onSend={chat.send}
            focusChunk={focusChunk}
            onFocusChunk={setFocusChunk}
            showProcess={process.show}
            onShowProcess={process.change}
          />
          {!session.token && (
            <HumanCheck
              lang={lang}
              failed={session.failed}
              onVerified={session.verify}
              onError={session.fail}
            />
          )}
        </div>
        {panel.mounted && (
          <div ref={panel.ref} className="min-w-0">
            <HoodPanel
              lang={lang}
              events={answer ? messageEvents(answer) : []}
              running={chat.busy}
              focusChunk={focusChunk}
              onFocusChunk={setFocusChunk}
            />
          </div>
        )}
      </main>
    </>
  );
}
