import { createFileRoute } from "@tanstack/react-router";
import { useReducer, useRef, useState } from "react";
import { Chat } from "#/components/Chat";
import { ChatConsole } from "#/components/ChatConsole";
import { DiveHud } from "#/components/DiveHud";
import { DiveWater } from "#/components/DiveWater";
import { HumanCheck } from "#/components/HumanCheck";
import { ModelCredits } from "#/components/ModelCredits";
import { PreDiveCheck } from "#/components/PreDiveCheck";
import { SeaScene } from "#/components/SeaScene";
import { Surface } from "#/components/Surface";
import { DIVE_START } from "#/constants/diveState.constants";
import { PREDIVE_COPY } from "#/constants/predive.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
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
import { diveReducer, isUnderwater } from "#/utils/diveState.utils";
import { preDiveChecks } from "#/utils/predive.utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { lang, toggle } = useLang();
  const session = useSession();
  const chat = useChatSession(session.token, session.reset);
  const process = useProcessPreference();
  const [focusChunk, setFocusChunk] = useState<string | null>(null);
  const [state, dispatch] = useReducer(diveReducer, DIVE_START);
  const { mode, plan, chatState } = state;
  const asked = chat.messages.length > 0;
  const diving = isUnderwater(mode);
  const revealed = mode === "reveal";
  const seaCanvas = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const consoleBox = useRef<HTMLDivElement>(null);
  const sea = useSea(seaCanvas, water);
  const view = useShownDive(chat.messages, state.watching, log);
  const { turns, shown, player, steps, layout, ended, onSand, bed } = view;
  const dive = DIVE_COPY[lang];

  const setMode = (next: DiveMode) => dispatch({ type: "mode", mode: next });
  const setChatState = (next: ChatState) =>
    dispatch({ type: "chat", chatState: next });

  const follow = useDiveFollow(
    mode,
    water,
    revealed && onSand ? bed : (layout.tops.at(-1) ?? null),
    () => {
      setMode("rest");
      sea.current?.reset();
    },
    // Scrolling away from the sand folds the chat so the log is in full view.
    () => dispatch({ type: "fold" }),
  );
  useSeaEvents(
    sea,
    player.events,
    steps,
    layout.tops,
    mode === "dive",
    view.written.words,
  );
  useSeaStage(sea, mode, chatState, onSand ? bed : null, follow.following);
  useRevealTimer(
    mode === "dive",
    (ended && !player.playing) || chat.failed,
    player.skipped,
    () => dispatch({ type: "reveal" }),
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
    () => setMode("ascend"),
  );

  function startDive(fresh = true) {
    scrollTo(0, 0);
    if (fresh) sea.current?.reset();
    sea.current?.loadDeep();
    player.start();
    setMode("dive");
  }

  function openCheck(next: PreDivePlan) {
    leaveConsole(() => dispatch({ type: "plan", plan: next }));
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || chat.busy || mode === "intro" || mode === "dive") return;
    const next = turns.length + 1;
    if (process.show) {
      const prior = pastMessages(chat.messages);
      openCheck({ question, replay: false, dive: next, prior });
      return;
    }
    chat.send(question);
    player.stop();
    dispatch({ type: "sent", dive: next });
  }

  function replay(turn: ThreadTurn | null) {
    if (!turn?.answer) return;
    const question = messageText(turn.question);
    openCheck({ question, replay: true, dive: turn.dive, prior: [] });
  }

  function newConversation() {
    chat.clear();
    scrollTo(0, 0);
    dispatch({ type: "clear" });
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
      <Surface lang={lang} mode={mode} asked={asked} onToggleLang={toggle} />
      <ChatConsole boxRef={consoleBox} dive={state} title={dive.back.title}>
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
          freshDive={revealed ? (shown?.dive ?? null) : state.fresh}
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
      </ChatConsole>
      {diving && (
        <>
          <DiveWater
            lang={lang}
            view={view}
            waterRef={water}
            logRef={log}
            focusChunk={focusChunk}
            onFocusChunk={setFocusChunk}
            onSurface={() => setMode("ascend")}
            onReplay={() => replay(shown)}
          />
          <DiveHud
            lang={lang}
            mode={mode}
            view={view}
            waterRef={water}
            covered={revealed && chatState !== "pill"}
            following={follow.following}
            onFollow={follow.resume}
            onSkip={() => {
              player.skip();
              follow.jump();
            }}
          />
        </>
      )}
      {plan && (
        <PreDiveCheck
          key={`${plan.dive}-${plan.replay}`}
          lang={lang}
          plan={plan}
          checks={preDiveChecks(PREDIVE_COPY[lang], plan, view.events)}
          onDescend={descend}
          onCancel={() => dispatch({ type: "cancel" })}
          onGone={() => dispatch({ type: "gone" })}
        />
      )}
      {mode === "rest" && <ModelCredits lang={lang} />}
    </>
  );
}
