import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { HoodPanel } from "#/components/HoodPanel";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { ModelCredits } from "#/components/ModelCredits";
import { SeaScene } from "#/components/SeaScene";
import { SurfaceHero } from "#/components/SurfaceHero";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { useChatSession } from "#/hooks/useChatSession";
import { useLang } from "#/hooks/useLang";
import { useProcessPreference } from "#/hooks/useProcessPreference";
import { useSea } from "#/hooks/useSea";
import { useSession } from "#/hooks/useSession";
import { latestAnswer, messageEvents } from "#/utils/chat.utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { lang, toggle } = useLang();
  const session = useSession();
  const chat = useChatSession(session.token, session.reset);
  const [focusChunk, setFocusChunk] = useState<string | null>(null);
  const answer = latestAnswer(chat.messages);
  const process = useProcessPreference();
  const asked = chat.messages.length > 0;
  const diving = asked && process.show;
  const seaCanvas = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLElement>(null);
  useSea(seaCanvas, water);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-asked", diving);
  }, [diving]);

  return (
    <>
      <SeaScene canvasRef={seaCanvas} />
      <header className="pointer-events-none fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(12px+env(safe-area-inset-top,0px))] z-20 flex items-center justify-between gap-2 lg:inset-x-8 [&>*]:pointer-events-auto">
        <p className="glass flex items-center gap-2.5 rounded-full py-1.5 ps-2 pe-3">
          <span
            aria-hidden="true"
            className="size-5.5 rounded-full border border-line-strong bg-[radial-gradient(circle_at_50%_35%,var(--color-haze)_0_34%,transparent_36%),linear-gradient(180deg,transparent_52%,var(--color-accent)_52%_58%,transparent_58%)]"
          />
          <span className="font-display text-xl italic leading-none rtl:not-italic">
            {PAGE_COPY[lang].title}
          </span>
        </p>
        <LangSwitch lang={lang} onToggle={toggle} />
      </header>
      <section aria-label={PAGE_COPY[lang].title} className="relative h-svh">
        {!asked && <SurfaceHero lang={lang} />}
      </section>
      <div
        data-diving={diving || undefined}
        className="fixed start-[max(16px,6vw)] bottom-[calc(max(5svh,16px)+env(safe-area-inset-bottom,0px))] z-15 flex max-h-[calc(100svh-140px)] w-[min(600px,calc(100%-32px))] flex-col gap-3 data-diving:max-lg:inset-x-0 data-diving:max-lg:bottom-0 data-diving:max-lg:max-h-[48svh] data-diving:max-lg:w-full data-diving:lg:start-auto data-diving:lg:end-8 data-diving:lg:bottom-6 data-diving:lg:w-120"
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
          stayAtSurface={!process.show}
          onStayAtSurface={(stay) => process.change(!stay)}
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
      {diving && (
        // TODO(P5.22): the water column with the depth rail and the dive log.
        <main
          ref={water}
          className="relative min-h-[300svh] px-4 pb-[60svh] lg:pe-136"
        >
          <HoodPanel
            lang={lang}
            events={answer ? messageEvents(answer) : []}
            running={chat.busy}
            focusChunk={focusChunk}
            onFocusChunk={setFocusChunk}
          />
        </main>
      )}
      {!diving && <ModelCredits lang={lang} />}
    </>
  );
}
