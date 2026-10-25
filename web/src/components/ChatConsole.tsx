import type { ReactNode, RefObject } from "react";
import type { DiveState } from "#/types/diveState.types";
import { consoleEntrance } from "#/utils/diveState.utils";

interface ChatConsoleProps {
  boxRef: RefObject<HTMLDivElement | null>;
  dive: DiveState;
  title: string;
  children: ReactNode;
}

export function ChatConsole({
  boxRef,
  dive,
  title,
  children,
}: ChatConsoleProps) {
  return (
    <div
      ref={boxRef}
      hidden={dive.mode !== "rest" && dive.mode !== "reveal"}
      data-console
      data-chat={dive.mode === "reveal" ? dive.chatState : undefined}
      // At the seabed: full at the bottom centre (a sheet on small screens), its height capped so
      // ~96px clears the report card; a pill or a compact side panel at the inline-end.
      className={`${consoleEntrance(dive)} fixed start-[max(16px,6vw)] bottom-[calc(max(5svh,16px)+env(safe-area-inset-bottom,0px))] z-15 flex max-h-[calc(100svh-var(--hero-end,140px)-max(5svh,16px)-24px)] w-[min(600px,calc(100%-32px))] flex-col gap-3 data-chat:bottom-[calc(16px+env(safe-area-inset-bottom,0px))] data-[chat=full]:end-0 data-[chat=full]:start-0 data-[chat=full]:mx-auto data-[chat=full]:max-h-[min(84svh,calc(74svh+48px),calc(100svh-var(--hud-end,0px)-40px))] data-[chat=full]:w-[min(720px,calc(100%-64px))] data-[chat=pill]:start-auto data-[chat=pill]:end-[max(16px,env(safe-area-inset-right,0px))] data-[chat=pill]:max-h-none data-[chat=pill]:w-auto lg:data-[chat=pill]:end-8 lg:data-[chat=side]:start-auto lg:data-[chat=side]:end-8 lg:data-[chat=side]:max-h-[min(80svh,calc(100svh-168px))] lg:data-[chat=side]:w-105 max-lg:data-[chat=full]:bottom-0 max-lg:data-[chat=full]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=full]:w-full max-lg:data-[chat=side]:start-0 max-lg:data-[chat=side]:end-0 max-lg:data-[chat=side]:bottom-0 max-lg:data-[chat=side]:max-h-[min(88svh,calc(74svh+96px))] max-lg:data-[chat=side]:w-full`}
    >
      <h2 id="reveal-title" tabIndex={-1} className="sr-only">
        {title}
      </h2>
      {children}
    </div>
  );
}
