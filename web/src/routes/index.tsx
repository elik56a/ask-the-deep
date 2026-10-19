import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "#/components/Chat";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { useChatSession } from "#/hooks/useChatSession";
import { useLang } from "#/hooks/useLang";
import { useSession } from "#/hooks/useSession";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { lang, toggle } = useLang();
  const session = useSession();
  const chat = useChatSession(session.token, session.reset);
  return (
    <>
      <header className="mx-auto flex max-w-2xl justify-end px-4 pt-4">
        <LangSwitch lang={lang} onToggle={toggle} />
      </header>
      <main className="mx-auto my-8 flex max-w-2xl flex-col gap-6 px-4">
        <h1 className="font-bold text-3xl">{PAGE_COPY[lang].title}</h1>
        <Chat
          lang={lang}
          messages={chat.messages}
          waiting={chat.waiting}
          canSend={Boolean(session.token) && !chat.busy}
          failed={chat.failed}
          onSend={chat.send}
        />
        {!session.token && (
          <HumanCheck
            lang={lang}
            failed={session.failed}
            onVerified={session.verify}
            onError={session.fail}
          />
        )}
      </main>
    </>
  );
}
