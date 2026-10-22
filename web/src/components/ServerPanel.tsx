import { useRef } from "react";
import { HOOD_COPY, STATUS_DOT } from "#/constants/hood.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import { useBuddy } from "#/hooks/useBuddy";
import { useEased } from "#/hooks/useEased";
import type { HoodStatus } from "#/types/hood.types";
import type { Lang } from "#/types/i18n.types";
import type { TraceTotals } from "#/types/trace.types";
import { formatInt, formatMs, formatUsd } from "#/utils/format.utils";

interface ServerPanelProps {
  lang: Lang;
  totals: TraceTotals;
  status: HoodStatus;
  /** Server time of the latest step shown, as the server measured it. */
  clockMs: number;
  /** On small screens the chat's sheet covers the scene, so the panel steps aside. */
  covered: boolean;
}

/** Only what the server reports, kept apart from the dive: status, its clock and its totals. */
export function ServerPanel({
  lang,
  totals,
  status,
  clockMs,
  covered,
}: ServerPanelProps) {
  const hud = DIVE_COPY[lang].hud;
  const canvas = useRef<HTMLCanvasElement>(null);
  useBuddy(canvas, status === "running");
  const [clock, calls, tokensIn, tokensOut, cost, ttft] = useEased([
    clockMs,
    totals.modelCalls,
    totals.inputTokens,
    totals.outputTokens,
    totals.costUsd,
    totals.ttftMs ?? 0,
  ]);
  const stats = [
    [hud.calls, "", String(Math.round(calls)), totals.modelCalls],
    [
      hud.tokens[0],
      hud.tokens[1],
      <>
        {formatInt(Math.round(tokensIn))}
        <span className="text-muted"> / </span>
        {formatInt(Math.round(tokensOut))}
      </>,
      `${totals.inputTokens}/${totals.outputTokens}`,
    ],
    [
      hud.cost,
      "",
      cost === totals.costUsd ? formatUsd(cost) : `$${cost.toFixed(6)}`,
      totals.costUsd,
    ],
    [
      hud.firstWord[0],
      hud.firstWord[1],
      totals.ttftMs === null ? "—" : formatMs(ttft),
      totals.ttftMs,
    ],
  ] as const;

  return (
    <aside
      aria-label={hud.label}
      className={`glass fixed end-8 top-[calc(12px+env(safe-area-inset-top,0px))] z-16 flex w-140 flex-col gap-3 rounded-[20px] px-4 pt-3 pb-3.5 max-lg:start-[max(16px,env(safe-area-inset-left,0px))] max-lg:end-[max(16px,env(safe-area-inset-right,0px))] max-lg:w-auto max-lg:gap-2.5 max-lg:px-3 max-lg:py-2.5 ${covered ? "max-lg:hidden" : ""}`}
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 max-lg:grid-cols-[48px_minmax(0,1fr)_auto]">
        <canvas
          ref={canvas}
          className="h-10.5 w-14 rounded-xl bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_16%,transparent),transparent)] max-lg:h-9 max-lg:w-12"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="whitespace-nowrap font-mono text-[11px] text-glow uppercase leading-none tracking-[0.12em]">
            {hud.from}
          </p>
          <p className="inline-flex items-center gap-2 font-medium text-sm leading-none">
            <span
              aria-hidden="true"
              className={`size-2 flex-none rounded-full ${STATUS_DOT[status]}`}
            />
            {HOOD_COPY[lang].status[status]}
          </p>
        </div>
        <p
          dir="ltr"
          className="flex flex-col items-end gap-1.5 font-medium font-mono text-[1.75rem] tabular-nums leading-none tracking-[-0.02em] max-lg:text-xl"
        >
          <span>{(clock / 1000).toFixed(3)} s</span>
          <small className="font-mono text-[10px] text-muted uppercase tracking-[0.1em]">
            {hud.serverTime}
          </small>
        </p>
      </div>
      <dl
        dir="ltr"
        className="flex justify-between border-line border-t pt-3 max-lg:grid max-lg:grid-cols-2 max-lg:gap-1.5 max-lg:border-0 max-lg:p-0"
      >
        {stats.map(([label, wide, value, target]) => (
          <div
            key={label}
            className="flex-none border-line border-s px-3.5 first:border-s-0 first:ps-0 max-lg:flex max-lg:min-w-0 max-lg:items-baseline max-lg:justify-between max-lg:gap-2 max-lg:rounded-[10px] max-lg:border max-lg:bg-text/5 max-lg:px-2.5 max-lg:py-1.5 max-lg:first:border max-lg:first:ps-2.5"
          >
            <dt className="mb-2 whitespace-nowrap font-mono text-[10px] text-muted uppercase leading-none tracking-[0.1em] max-lg:mb-0 max-lg:text-[9px]">
              {label}
              <span className="max-lg:hidden">{wide}</span>
            </dt>
            <dd className="truncate font-medium font-mono text-[1.0625rem] tabular-nums leading-none max-lg:text-sm">
              {/* A new value remounts the number, so the flash plays again */}
              <span key={String(target)} className="flash">
                {value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
