import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { DepthRail } from "#/components/DepthRail";
import { DiveComputer } from "#/components/DiveComputer";
import { DiveLog } from "#/components/DiveLog";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { ModelCredits } from "#/components/ModelCredits";
import { PlaybackBar } from "#/components/PlaybackBar";
import { Seabed } from "#/components/Seabed";
import { SeaScene } from "#/components/SeaScene";
import { SurfaceHero } from "#/components/SurfaceHero";
import { Button } from "#/components/ui/button";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { REVEAL_AFTER_SKIP_MS, REVEAL_MS } from "#/constants/pace.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useAskFocus } from "#/hooks/useAskFocus";
import { useChatSession } from "#/hooks/useChatSession";
import { useDiveFollow } from "#/hooks/useDiveFollow";
import { useDiveLayout } from "#/hooks/useDiveLayout";
import { useLang } from "#/hooks/useLang";
import { usePacedPlayer } from "#/hooks/usePacedPlayer";
import { useProcessPreference } from "#/hooks/useProcessPreference";
import { useSea } from "#/hooks/useSea";
import { useSeaEvents } from "#/hooks/useSeaEvents";
import { useSession } from "#/hooks/useSession";
import type { DiveMode } from "#/types/sea.types";
import { messageEvents, messageText } from "#/utils/chat.utils";
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
  const player = usePacedPlayer(
    last?.role === "assistant" ? messageEvents(last) : [],
  );
  const steps = diveSteps(player.events);
  const layout = useDiveLayout(
    log,
    steps.map((step) => step.kind),
  );
  const trace = buildTrace(player.events);
  const ended =
    steps.at(-1)?.kind === "seabed" || steps.at(-1)?.kind === "abort";
  const follow = useDiveFollow(mode, water, layout.tops.at(-1) ?? null, () => {
    setMode("rest");
    sea.current?.reset();
  });
  useSeaEvents(sea, player.events, steps, layout.tops, mode === "dive");
  const dive = DIVE_COPY[lang];
  const questions = chat.messages.filter((message) => message.role === "user");
  const question = questions.at(-1);

  // The answer waits for the seabed: the chat comes back once the report has been read.
  const landed = ended && !player.playing;
  useEffect(() => {
    if (mode !== "dive" || !(landed || chat.failed)) return;
    const timer = setTimeout(
      () => setMode("reveal"),
      player.skipped ? REVEAL_AFTER_SKIP_MS : REVEAL_MS,
    );
    return () => clearTimeout(timer);
  }, [mode, landed, chat.failed, player.skipped]);
  useAskFocus(mode, "question", "reveal-title");

  useEffect(() => {
    document.documentElement.toggleAttribute("data-diving", diving);
  }, [diving]);

  function startDive() {
    scrollTo(0, 0);
    sea.current?.reset();
    player.start();
    setMode("dive");
  }

  function ask(question: string) {
    if (!question.trim() || chat.busy) return;
    chat.send(question);
    if (process.show) startDive();
    else player.stop();
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
      <header
        inert={mode === "dive" || mode === "reveal"}
        className="pointer-events-none fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(12px+env(safe-area-inset-top,0px))] z-20 flex items-center justify-end gap-2 transition-opacity duration-300 inert:opacity-0 lg:inset-x-8 [&>*]:pointer-events-auto"
      >
        <LangSwitch lang={lang} onToggle={toggle} />
      </header>
      <section aria-label={PAGE_COPY[lang].title} className="relative h-svh">
        {!asked && <SurfaceHero lang={lang} />}
      </section>
      <div
        hidden={mode === "dive" || mode === "ascend"}
        data-diving={diving || undefined}
        className={`${mode === "reveal" ? "console-rise " : ""}fixed start-[max(16px,6vw)] bottom-[calc(max(5svh,16px)+env(safe-area-inset-bottom,0px))] z-15 flex max-h-[calc(100svh-140px)] w-[min(600px,calc(100%-32px))] flex-col gap-3 data-diving:max-lg:inset-x-0 data-diving:max-lg:bottom-0 data-diving:max-lg:max-h-[48svh] data-diving:max-lg:w-full data-diving:lg:start-auto data-diving:lg:end-8 data-diving:lg:bottom-6 data-diving:lg:max-h-[calc(100svh-270px)] data-diving:lg:w-120`}
      >
        <h2 id="reveal-title" tabIndex={-1} className="sr-only">
          {dive.back.title}
        </h2>
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
          collapsible={diving}
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
          {mode === "dive" && (
            <p className="glass fixed start-8 top-[calc(70px+env(safe-area-inset-top,0px))] z-14 max-w-[min(440px,calc(100%-536px))] rounded-[14px] px-3.5 py-2.5 text-sm leading-[1.45] max-lg:hidden">
              {dive.guide[0]}
              <b className="font-semibold text-accent">{dive.guide[1]}</b>
              {dive.guide[2]}
            </p>
          )}
          <div className="absolute inset-y-0 inset-x-[max(16px,env(safe-area-inset-left,0px))] lg:inset-x-8">
            <DepthRail lang={lang} />
            <DiveLog
              lang={lang}
              steps={steps}
              ended={ended}
              tops={layout.tops}
              listRef={log}
              retrieved={trace.retrieved}
              focusChunk={focusChunk}
              onFocusChunk={setFocusChunk}
              end={
                ended &&
                !player.playing && (
                  <Seabed
                    lang={lang}
                    steps={steps}
                    tops={layout.tops}
                    trace={trace}
                    onSurface={() => setMode("ascend")}
                    onReplay={startDive}
                  />
                )
              }
            />
          </div>
        </main>
      )}
      {diving && (
        <DiveComputer
          lang={lang}
          waterRef={water}
          totals={trace.totals}
          status={trace.outcome ?? (chat.busy ? "running" : "idle")}
          running={chat.busy || player.playing}
          finalMs={trace.totals.latencyMs ?? trace.lastMs}
        />
      )}
      {mode === "dive" && player.playing && (
        <PlaybackBar
          lang={lang}
          dive={questions.length}
          question={question ? messageText(question) : ""}
          paused={player.paused}
          speed={player.speed}
          progress={player.progress}
          serverMs={player.serverMs}
          serverDone={player.serverDone}
          onPause={player.setPaused}
          onSpeed={player.setSpeed}
          onSkip={player.skip}
        />
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
      <p className="sr-only" aria-live="polite">
        {mode === "reveal" &&
          (trace.outcome === "answered" ? dive.back.answered : dive.back.empty)}
      </p>
      {!diving && <ModelCredits lang={lang} />}
    </>
  );
}
