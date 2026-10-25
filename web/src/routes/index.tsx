import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import { PREDIVE_COPY } from "#/constants/predive.constants";
import { DIVE_COPY, DIVER_LINE } from "#/constants/sea.constants";
import { useAskFocus } from "#/hooks/useAskFocus";
import { useChatSession } from "#/hooks/useChatSession";
import { useConsoleMotion } from "#/hooks/useConsoleMotion";
import { useDiveFollow } from "#/hooks/useDiveFollow";
import { useLang } from "#/hooks/useLang";
import { useProcessPreference } from "#/hooks/useProcessPreference";
import { useRevealScroll } from "#/hooks/useRevealScroll";
import { useRevealTimer } from "#/hooks/useRevealTimer";
import { useSea } from "#/hooks/useSea";
import { useSeaEvents } from "#/hooks/useSeaEvents";
import { useSeaStage } from "#/hooks/useSeaStage";
import { useSession } from "#/hooks/useSession";
import { useShownDive } from "#/hooks/useShownDive";
import type { ChatState } from "#/types/chat.types";
import type { PreDivePlan } from "#/types/predive.types";
import type { DiveMode } from "#/types/sea.types";
import type { ThreadTurn } from "#/types/thread.types";
import { messageText, pastMessages } from "#/utils/chat.utils";
import { preDiveChecks } from "#/utils/predive.utils";

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
  const [chatState, setChatState] = useState<ChatState>("full");
  // The dive on screen: the newest, or an earlier one picked with "Watch again"
  const [watching, setWatching] = useState<number | null>(null);
  const [stayFresh, setStayFresh] = useState<number | null>(null);
  // Once the chat has stepped aside for a dive, it surfaces with an entrance whenever it returns.
  const [returned, setReturned] = useState(false);
  const diving = mode !== "rest" && mode !== "intro";
  const revealed = mode === "reveal";
  const seaCanvas = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const consoleBox = useRef<HTMLDivElement>(null);
  const sea = useSea(seaCanvas, water);
  const view = useShownDive(chat.messages, watching, log);
  const { turns, shown, player, steps, layout, trace, ended, onSand, bed } =
    view;
  const dive = DIVE_COPY[lang];

  const follow = useDiveFollow(
    mode,
    water,
    revealed && onSand ? bed : (layout.tops.at(-1) ?? null),
    () => {
      setMode("rest");
      sea.current?.reset();
    },
    // Scrolling away from the sand folds the chat so the log is in full view.
    () => {
      if (revealed) setChatState((c) => (c === "full" ? "pill" : c));
    },
  );
  useSeaEvents(
    sea,
    player.events,
    steps,
    layout.tops,
    mode === "dive",
    view.written.words,
  );
  useSeaStage(sea, mode, chatState, onSand ? bed : null);
  useRevealTimer(
    mode === "dive",
    (ended && !player.playing) || chat.failed,
    player.skipped,
    () => {
      setChatState("full");
      setMode("reveal");
    },
  );
  useAskFocus(mode, "question", "reveal-title");
  const leaveConsole = useConsoleMotion(consoleBox, revealed, chatState);
  useRevealScroll(
    revealed,
    () => {
      follow.resume();
      setChatState("full");
    },
    land,
    () => {
      setChatState("full");
      setMode("ascend");
    },
  );

  function startDive(fresh = true) {
    scrollTo(0, 0);
    if (fresh) sea.current?.reset();
    sea.current?.loadDeep();
    player.start();
    setMode("dive");
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || chat.busy || mode === "intro" || mode === "dive") return;
    if (!process.show) {
      setWatching(null);
      chat.send(question);
      player.stop();
      setStayFresh(turns.length + 1);
      return;
    }
    const prior = pastMessages(chat.messages);
    setReturned(true);
    leaveConsole(() => {
      setWatching(null);
      setStayFresh(null);
      setPlan({ question, replay: false, dive: turns.length + 1, prior });
      setMode("intro");
    });
  }

  function replay(turn: ThreadTurn | null) {
    if (!turn?.answer) return;
    const question = messageText(turn.question);
    setReturned(true);
    leaveConsole(() => {
      setWatching(turn.dive);
      setStayFresh(null);
      setPlan({ question, replay: true, dive: turn.dive, prior: [] });
      setMode("intro");
    });
  }

  function newConversation() {
    chat.clear();
    setWatching(null);
    setStayFresh(null);
    scrollTo(0, 0);
    setMode("rest");
  }

  // The question leaves as the diver jumps, so the server works while he is in the air; the dive
  // starts as his head goes under.
  function descend() {
    if (plan && !plan.replay) chat.send(plan.question);
    const s = sea.current;
    if (!s) {
      startDive();
      return;
    }
    s.reset();
    s.jump(() => startDive(false));
  }

  function land() {
    follow.rush();
    setChatState("full");
  }

  function reread() {
    setChatState("pill");
    follow.look(layout.tops.at(-1) ?? 0);
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
        inert={mode !== "rest"}
        className="pointer-events-none fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(12px+env(safe-area-inset-top,0px))] z-20 flex items-center justify-end gap-2 transition-opacity duration-300 inert:opacity-0 lg:inset-x-8 [&>*]:pointer-events-auto"
      >
        <LangSwitch lang={lang} onToggle={toggle} />
      </header>
      <section
        aria-label={PAGE_COPY[lang].title}
        inert={mode !== "rest" && mode !== "ascend"}
        className="relative h-svh transition-opacity duration-300 inert:opacity-0"
      >
        <SurfaceHero lang={lang} talked={asked} />
      </section>
      <div
        ref={consoleBox}
        hidden={mode === "intro" || mode === "dive" || mode === "ascend"}
        data-console
        data-chat={revealed ? chatState : undefined}
        // At the seabed: full at the bottom centre (a sheet on small screens), its height capped so
        // ~96px clears the report card; a pill or a compact side panel at the inline-end.
        className={`${revealed ? "console-rise " : returned && mode === "rest" ? "console-surface " : ""}fixed start-[max(16px,6vw)] bottom-[calc(max(5svh,16px)+env(safe-area-inset-bottom,0px))] z-15 flex max-h-[calc(100svh-var(--hero-end,140px)-max(5svh,16px)-24px)] w-[min(600px,calc(100%-32px))] flex-col gap-3 data-chat:bottom-[calc(16px+env(safe-area-inset-bottom,0px))] data-[chat=full]:end-0 data-[chat=full]:start-0 data-[chat=full]:mx-auto data-[chat=full]:max-h-[min(84svh,calc(74svh+48px),calc(100svh-var(--hud-end,0px)-40px))] data-[chat=full]:w-[min(720px,calc(100%-64px))] data-[chat=pill]:start-auto data-[chat=pill]:end-[max(16px,env(safe-area-inset-right,0px))] data-[chat=pill]:max-h-none data-[chat=pill]:w-auto lg:data-[chat=pill]:end-8 lg:data-[chat=side]:start-auto lg:data-[chat=side]:end-8 lg:data-[chat=side]:max-h-[min(80svh,calc(100svh-168px))] lg:data-[chat=side]:w-105 max-lg:data-[chat=full]:bottom-0 max-lg:data-[chat=full]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=full]:w-full max-lg:data-[chat=side]:start-0 max-lg:data-[chat=side]:end-0 max-lg:data-[chat=side]:bottom-0 max-lg:data-[chat=side]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=side]:w-full`}
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
          state={revealed ? chatState : null}
          onStateChange={setChatState}
          onSurface={() => setMode("ascend")}
          onReread={reread}
          onLand={land}
          freshDive={revealed ? (shown?.dive ?? null) : stayFresh}
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
          style={{
            height: `calc(${view.floor}px + ${(1 - DIVER_LINE) * 100}svh)`,
          }}
        >
          <div className="absolute inset-y-0 inset-x-[max(16px,env(safe-area-inset-left,0px))] lg:inset-x-8">
            <DepthRail lang={lang} />
            <DiveLog
              lang={lang}
              steps={steps}
              ended={ended}
              tops={layout.tops}
              measured={layout.measured}
              listRef={log}
              ctx={view.ctx}
              model={view.model}
              written={view.written}
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
            covered={revealed && chatState !== "pill"}
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
          className="glass follow-glow fixed start-1/2 bottom-[calc(150px+env(safe-area-inset-bottom,0px))] z-17 min-h-11 -translate-x-1/2 rounded-full px-4 rtl:translate-x-1/2"
        >
          {dive.follow} ↓
        </Button>
      )}
      <p className="sr-only" aria-live="polite">
        {revealed &&
          (trace.outcome === "answered" ? dive.back.answered : dive.back.empty)}
      </p>
      {plan && (
        <PreDiveCheck
          key={`${plan.dive}-${plan.replay}`}
          lang={lang}
          plan={plan}
          checks={preDiveChecks(PREDIVE_COPY[lang], plan, view.events)}
          onDescend={descend}
          onCancel={cancelDive}
          onGone={() => setPlan(null)}
        />
      )}
      {mode === "rest" && <ModelCredits lang={lang} />}
    </>
  );
}
