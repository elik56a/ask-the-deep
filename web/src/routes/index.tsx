import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { DepthRail } from "#/components/DepthRail";
import { DepthTag } from "#/components/DepthTag";
import { DiveLog } from "#/components/DiveLog";
import { HumanCheck } from "#/components/HumanCheck";
import { LangSwitch } from "#/components/LangSwitch";
import { ModelCredits } from "#/components/ModelCredits";
import { PlaybackBar } from "#/components/PlaybackBar";
import { PreDiveCheck } from "#/components/PreDiveCheck";
import { Seabed } from "#/components/Seabed";
import { SeaScene } from "#/components/SeaScene";
import { ServerPanel } from "#/components/ServerPanel";
import { SurfaceHero } from "#/components/SurfaceHero";
import { Button } from "#/components/ui/button";
import { PAGE_COPY } from "#/constants/i18n.constants";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import { REVEAL_AFTER_SKIP_MS, REVEAL_MS } from "#/constants/pace.constants";
import { PREDIVE_COPY } from "#/constants/predive.constants";
import { BED_BELOW_PX, DIVE_COPY, DIVER_LINE } from "#/constants/sea.constants";
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
import type { ChatState } from "#/types/chat.types";
import type { PreDivePlan } from "#/types/predive.types";
import type { DiveMode } from "#/types/sea.types";
import type { ThreadTurn } from "#/types/thread.types";
import { messageEvents, messageText, pastMessages } from "#/utils/chat.utils";
import { diveSteps } from "#/utils/depth.utils";
import { preDiveChecks } from "#/utils/predive.utils";
import { threadTurns } from "#/utils/thread.utils";
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
  const [plan, setPlan] = useState<PreDivePlan | null>(null);
  const diving = mode !== "rest" && mode !== "intro";
  const seaCanvas = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const sea = useSea(seaCanvas, water);

  const turns = threadTurns(chat.messages);
  // The dive on screen: the newest, or an earlier one picked with "Watch again"
  const [watching, setWatching] = useState<number | null>(null);
  const [stayFresh, setStayFresh] = useState<number | null>(null);
  const shown = (watching ? turns[watching - 1] : turns.at(-1)) ?? null;
  const shownEvents = shown?.answer ? messageEvents(shown.answer) : [];
  const player = usePacedPlayer(shownEvents);
  const steps = diveSteps(player.events);
  const layout = useDiveLayout(
    log,
    steps.map((step) => step.kind),
  );
  const trace = buildTrace(player.events);
  const ended =
    steps.at(-1)?.kind === "seabed" || steps.at(-1)?.kind === "abort";
  // The sand lies below the report; at the seabed the dive follows down to it and scroll stops there.
  const onSand = steps.at(-1)?.kind === "seabed";
  const bed = layout.bottom + BED_BELOW_PX;
  const floor = onSand ? bed : layout.bottom;
  const [chatState, setChatState] = useState<ChatState>("full");
  const follow = useDiveFollow(
    mode,
    water,
    mode === "reveal" && onSand ? bed : (layout.tops.at(-1) ?? null),
    () => {
      setMode("rest");
      sea.current?.reset();
    },
    // Scrolling away from the sand folds the chat so the log is in full view.
    () => {
      if (mode === "reveal") setChatState((c) => (c === "full" ? "pill" : c));
    },
  );
  useSeaEvents(sea, player.events, steps, layout.tops, mode === "dive");
  const dive = DIVE_COPY[lang];

  // The answer waits for the seabed: the chat comes back once the report has been read.
  const landed = ended && !player.playing;
  useEffect(() => {
    if (mode !== "dive" || !(landed || chat.failed)) return;
    const timer = setTimeout(
      () => {
        setChatState("full");
        setMode("reveal");
      },
      player.skipped ? REVEAL_AFTER_SKIP_MS : REVEAL_MS,
    );
    return () => clearTimeout(timer);
  }, [mode, landed, chat.failed, player.skipped]);
  useAskFocus(mode, "question", "reveal-title");

  useEffect(() => {
    sea.current?.landed(mode === "reveal" && chatState === "full");
  }, [sea, mode, chatState]);
  useEffect(() => {
    if (mode === "reveal" && onSand) sea.current?.seabed(bed);
  }, [sea, mode, onSand, bed]);

  // Back down onto the sand, by scroll or a wheel past the end, the full chat returns.
  const { resume, rush } = follow;
  useEffect(() => {
    if (mode !== "reveal") return;
    let prev = scrollY;
    const atSand = () =>
      scrollY >= document.documentElement.scrollHeight - innerHeight - 24;
    const onScroll = () => {
      if (scrollY > prev && atSand()) {
        resume();
        setChatState("full");
      }
      prev = scrollY;
    };
    const onWheel = (event: WheelEvent) => {
      const inChat =
        event.target instanceof Element &&
        event.target.closest("[data-console]");
      if (event.deltaY > 0 && atSand() && !inChat) {
        rush();
        setChatState("full");
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("wheel", onWheel);
    };
  }, [mode, resume, rush]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-diving", diving);
  }, [diving]);

  function startDive() {
    scrollTo(0, 0);
    sea.current?.reset();
    sea.current?.loadDeep();
    player.start();
    setMode("dive");
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || chat.busy || mode === "intro" || mode === "dive") return;
    setWatching(null);
    if (!process.show) {
      chat.send(question);
      player.stop();
      setStayFresh(turns.length + 1);
      return;
    }
    setStayFresh(null);
    const prior = pastMessages(chat.messages);
    setPlan({ question, replay: false, dive: turns.length + 1, prior });
    setMode("intro");
  }

  function replay(turn: ThreadTurn | null) {
    if (!turn?.answer) return;
    setWatching(turn.dive);
    setStayFresh(null);
    const question = messageText(turn.question);
    setPlan({ question, replay: true, dive: turn.dive, prior: [] });
    setMode("intro");
  }

  function newConversation() {
    chat.clear();
    setWatching(null);
    setStayFresh(null);
    scrollTo(0, 0);
    setMode("rest");
  }

  function descend() {
    if (plan && !plan.replay) chat.send(plan.question);
    startDive();
  }

  function land() {
    follow.rush();
    setChatState("full");
  }

  function reread() {
    follow.pause();
    setChatState("pill");
    const top = water.current
      ? water.current.getBoundingClientRect().top + scrollY
      : 0;
    scrollTo({
      top: top + (layout.tops.at(-1) ?? 0) - innerHeight * DIVER_LINE,
      behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth",
    });
  }

  function cancelDive() {
    setPlan(null);
    setMode("rest");
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
        inert={mode === "intro" || mode === "dive" || mode === "reveal"}
        className="pointer-events-none fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(12px+env(safe-area-inset-top,0px))] z-20 flex items-center justify-end gap-2 transition-opacity duration-300 inert:opacity-0 lg:inset-x-8 [&>*]:pointer-events-auto"
      >
        <LangSwitch lang={lang} onToggle={toggle} />
      </header>
      <section aria-label={PAGE_COPY[lang].title} className="relative h-svh">
        <SurfaceHero lang={lang} talked={asked} />
      </section>
      <div
        hidden={mode === "intro" || mode === "dive" || mode === "ascend"}
        data-console
        data-chat={mode === "reveal" ? chatState : undefined}
        // At the seabed: full at the bottom centre (a sheet on small screens), its height capped so
        // ~96px clears the report card; a pill or a compact side panel at the inline-end.
        className={`${mode === "reveal" ? "console-rise " : ""}fixed start-[max(16px,6vw)] bottom-[calc(max(5svh,16px)+env(safe-area-inset-bottom,0px))] z-15 flex max-h-[calc(100svh-var(--hero-end,140px)-max(5svh,16px)-24px)] w-[min(600px,calc(100%-32px))] flex-col gap-3 data-chat:bottom-[calc(16px+env(safe-area-inset-bottom,0px))] data-[chat=full]:end-0 data-[chat=full]:start-0 data-[chat=full]:mx-auto data-[chat=full]:max-h-[min(84svh,calc(74svh+48px))] data-[chat=full]:w-[min(720px,calc(100%-64px))] data-[chat=pill]:start-auto data-[chat=pill]:end-[max(16px,env(safe-area-inset-right,0px))] data-[chat=pill]:max-h-none data-[chat=pill]:w-auto lg:data-[chat=pill]:end-8 lg:data-[chat=side]:start-auto lg:data-[chat=side]:end-8 lg:data-[chat=side]:max-h-[min(80svh,calc(100svh-168px))] lg:data-[chat=side]:w-105 max-lg:data-[chat=full]:bottom-0 max-lg:data-[chat=full]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=full]:w-full max-lg:data-[chat=side]:start-0 max-lg:data-[chat=side]:end-0 max-lg:data-[chat=side]:bottom-0 max-lg:data-[chat=side]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=side]:w-full`}
      >
        <h2 id="reveal-title" tabIndex={-1} className="sr-only">
          {dive.back.title}
        </h2>
        <Chat
          lang={lang}
          messages={chat.messages}
          canSend={Boolean(session.token) && !chat.busy}
          failed={chat.failed}
          onSend={ask}
          focusChunk={focusChunk}
          onFocusChunk={setFocusChunk}
          stayAtSurface={!process.show}
          onStayAtSurface={stay}
          state={mode === "reveal" ? chatState : null}
          onStateChange={setChatState}
          onSurface={() => setMode("ascend")}
          onReread={reread}
          onLand={land}
          freshDive={mode === "reveal" ? (shown?.dive ?? null) : stayFresh}
          onWatch={replay}
          onNewConversation={newConversation}
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
          style={{ height: `calc(${floor}px + ${(1 - DIVER_LINE) * 100}svh)` }}
        >
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
                    onReplay={() => replay(shown)}
                  />
                )
              }
            />
          </div>
        </main>
      )}
      {diving && (
        <>
          <ServerPanel
            lang={lang}
            totals={trace.totals}
            status={
              trace.outcome ?? (player.events.length > 0 ? "running" : "idle")
            }
            clockMs={player.events.at(-1)?.t_ms ?? 0}
            covered={mode === "reveal" && chatState !== "pill"}
          />
          <DepthTag lang={lang} waterRef={water} />
        </>
      )}
      {mode === "dive" && player.playing && (
        <PlaybackBar
          lang={lang}
          dive={shown?.dive ?? 0}
          question={shown ? messageText(shown.question) : ""}
          paused={player.paused}
          speed={player.speed}
          progress={player.progress}
          serverMs={player.serverMs}
          serverDone={player.serverDone}
          onPause={player.setPaused}
          onSpeed={player.setSpeed}
          onSkip={() => {
            player.skip();
            follow.jump();
          }}
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
      {plan && (
        <PreDiveCheck
          key={`${plan.dive}-${plan.replay}`}
          lang={lang}
          plan={plan}
          checks={preDiveChecks(PREDIVE_COPY[lang], plan, shownEvents)}
          onDescend={descend}
          onCancel={cancelDive}
          onGone={() => setPlan(null)}
        />
      )}
      {mode === "rest" && <ModelCredits lang={lang} />}
    </>
  );
}
