import type { RefObject } from "react";
import { Eyebrow } from "#/components/Eyebrow";
import { HOOD_COPY, STATUS_DOT } from "#/constants/hood.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useDiveDepth } from "#/hooks/useDiveDepth";
import { useLiveClock } from "#/hooks/useLiveClock";
import type { HoodStatus } from "#/types/hood.types";
import type { Lang } from "#/types/i18n.types";
import type { TraceTotals } from "#/types/trace.types";
import { zoneAt } from "#/utils/depth.utils";
import { formatInt, formatMs, formatUsd } from "#/utils/format.utils";

interface DiveComputerProps {
  lang: Lang;
  waterRef: RefObject<HTMLElement | null>;
  totals: TraceTotals;
  status: HoodStatus;
  running: boolean;
  finalMs: number;
}

export function DiveComputer({
  lang,
  waterRef,
  totals,
  status,
  running,
  finalMs,
}: DiveComputerProps) {
  const dive = DIVE_COPY[lang];
  const hood = HOOD_COPY[lang];
  const meters = useDiveDepth(waterRef);
  const live = useLiveClock(running);
  const ms = running ? live : finalMs;
  const stats = [
    [hood.meters.calls, String(totals.modelCalls)],
    [
      hood.meters.tokens,
      `${formatInt(totals.inputTokens)} / ${formatInt(totals.outputTokens)}`,
    ],
    [hood.meters.cost, formatUsd(totals.costUsd)],
    [
      hood.meters.firstWord,
      totals.ttftMs === null ? "—" : formatMs(totals.ttftMs),
    ],
  ];
  return (
    <aside
      aria-label={dive.hud.label}
      className="glass fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(64px+env(safe-area-inset-top,0px))] z-16 grid grid-cols-[auto_1fr] items-end gap-x-4.5 gap-y-1.5 rounded-[20px] px-4 py-3 lg:start-auto lg:end-8 lg:w-105 lg:py-3.5"
    >
      <div>
        <p className="sr-only">{dive.hud.depth}</p>
        <p
          dir="ltr"
          className="text-start font-medium font-mono text-[2rem] tabular-nums leading-none tracking-tighter lg:text-[2.5rem]"
        >
          {formatInt(meters)}
          <small className="ms-1 text-base text-muted">m</small>
        </p>
        <p className="mt-1 font-display text-lg italic leading-none rtl:not-italic">
          {meters > 0 ? dive.zones[zoneAt(meters).id] : dive.surface}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <p role="status" className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${STATUS_DOT[status]}`}
          />
          {hood.status[status]}
        </p>
        <p className="font-mono text-muted text-sm tabular-nums">
          <span className="sr-only">{dive.hud.diveTime} </span>
          <span dir="ltr">{(ms / 1000).toFixed(3)} s</span>
        </p>
      </div>
      <dl className="col-span-2 flex justify-between gap-3 whitespace-nowrap border-line border-t pt-2.5 max-lg:hidden">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <dt>
              <Eyebrow>{label}</Eyebrow>
            </dt>
            <dd
              dir="ltr"
              className="text-start font-medium font-mono text-sm tabular-nums"
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
