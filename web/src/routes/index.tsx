import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { DepthRail } from "#/components/DepthRail";
import { DiveLog } from "#/components/DiveLog";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { ModelCredits } from "#/components/ModelCredits";
import { SeaScene } from "#/components/SeaScene";
import { SurfaceHero } from "#/components/SurfaceHero";
import { Button } from "#/components/ui/button";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useChatSession } from "#/hooks/useChatSession";
import { useDiveFollow } from "#/hooks/useDiveFollow";
import { useDiveLayout } from "#/hooks/useDiveLayout";
import { useLang } from "#/hooks/useLang";
import { useProcessPreference } from "#/hooks/useProcessPreference";
import { useReplay } from "#/hooks/useReplay";
import { useSea } from "#/hooks/useSea";
import { useSession } from "#/hooks/useSession";
import type { DiveMode } from "#/types/sea.types";
import { messageEvents } from "#/utils/chat.utils";
import { diveSteps } from "#/utils/depth.utils";
import { buildTrace } from "#/utils/trace.utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { lang, toggle } = useLang();
  const session = useSession();
  const chat = useChatSession(session.token, session.reset);
  const [focusChunk, setFocusChunk] = useState<string | null>(null);
  const process = useProcessPreference();
  const asked = chat.messages.length > 0;
  const [mode, setMode] = useState<DiveMode>("rest");
  const diving = mode !== "rest";
  const seaCanvas = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const sea = useSea(seaCanvas, water);

  const last = chat.messages.at(-1);
  const replay = useReplay(
    last?.role === "assistant" ? messageEvents(last) : [],
  );
  const steps = diveSteps(replay.events);
  const layout = useDiveLayout(
    log,
    steps.map((step) => step.kind),
  );
  const ended =
    steps.at(-1)?.kind === "seabed" || steps.at(-1)?.kind === "abort";
  const follow = useDiveFollow(mode, water, layout.tops.at(-1) ?? null, () => {
    setMode("rest");
    sea.current?.reset();
  });
  const dive = DIVE_COPY[lang];

  useEffect(() => {
    document.documentElement.toggleAttribute("data-diving", diving);
  }, [diving]);

  function startDive() {
    scrollTo(0, 0);
    sea.current?.reset();
    setMode("dive");
  }

  function ask(question: string) {
    if (!question.trim() || chat.busy) return;
    chat.send(question);
    if (process.show) startDive();
  }

  function stay(on: boolean) {
    process.change(!on);
    if (on && diving) {
      scrollTo(0, 0);
      setMode("rest");
    } else if (!on && asked) startDive();
  }

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
          onSend={ask}
          focusChunk={focusChunk}
          onFocusChunk={setFocusChunk}
          stayAtSurface={!process.show}
          onStayAtSurface={stay}
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
        <main
          ref={water}
          className="relative min-h-svh overflow-clip"
          style={{ height: `calc(${layout.bottom}px + 80svh)` }}
        >
          <div className="absolute inset-y-0 inset-x-[max(16px,env(safe-area-inset-left,0px))] lg:inset-x-8">
            <DepthRail lang={lang} />
            <DiveLog
              lang={lang}
              steps={steps}
              tops={layout.tops}
              listRef={log}
              retrieved={buildTrace(replay.events).retrieved}
              focusChunk={focusChunk}
              onFocusChunk={setFocusChunk}
              end={
                ended &&
                !replay.replaying && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" onClick={() => setMode("ascend")}>
                      {dive.surface} ↑
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        startDive();
                        replay.replay();
                      }}
                    >
                      {dive.replay}
                    </Button>
                  </div>
                )
              }
            />
          </div>
        </main>
      )}
      {mode === "dive" && !follow.following && (
        <Button
          variant="outline"
          onClick={follow.resume}
          className="glass fixed start-[max(100px,calc(env(safe-area-inset-left,0px)+84px))] bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-17 min-h-11 rounded-full px-4 max-lg:bottom-[calc(48svh+12px)]"
        >
          {dive.follow} ↓
        </Button>
      )}
      {!diving && <ModelCredits lang={lang} />}
    </>
  );
}
