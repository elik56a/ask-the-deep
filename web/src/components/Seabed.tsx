import { ArrowUp } from "lucide-react";
import { Button } from "#/components/ui/button";
import { HOOD_COPY } from "#/constants/hood.constants";
import {
  DIVE_COPY,
  PROFILE_CHART,
  PROFILE_LEGEND,
  STEP_TONE,
  ZONES,
} from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import type { DiveStep } from "#/types/sea.types";
import type { Trace } from "#/types/trace.types";
import { pxToMeters } from "#/utils/depth.utils";
import { diveProfile, profileScale } from "#/utils/diveProfile.utils";
import { formatInt, formatMs, formatTick } from "#/utils/format.utils";
import { fill } from "#/utils/toolSteps.utils";
import {
  rulerTicks,
  traceLanded,
  traceMs,
  traceReceipt,
} from "#/utils/trace.utils";

interface SeabedProps {
  lang: Lang;
  steps: DiveStep[];
  tops: number[];
  trace: Trace;
  onSurface: () => void;
  onReplay: () => void;
}

export function Seabed({
  lang,
  steps,
  tops,
  trace,
  onSurface,
  onReplay,
}: SeabedProps) {
  const copy = DIVE_COPY[lang];
  const hood = HOOD_COPY[lang];
  const totalMs = traceMs(trace);
  const points = diveProfile(steps, tops, totalMs);
  const { maxZone, x, y } = profileScale(points, totalMs);
  const { width: W, height: H, pad, labelGap, labelRise } = PROFILE_CHART;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-case/46 px-3.5 py-3.5 backdrop-blur-sm">
      {traceLanded(trace) ? (
        <figure dir="ltr" className="flex flex-col gap-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={fill(copy.seabed.profileLabel, {
              n: String(steps.length),
              m: `${formatInt(Math.round(pxToMeters(tops.at(-1) ?? 0)))} m`,
              t: formatMs(totalMs),
            })}
            className="block h-auto w-full overflow-visible font-mono text-[10px]"
          >
            {ZONES.filter((_, i) => i <= maxZone).map((zone, i) => (
              <g key={zone.id}>
                <line
                  x1={pad.start}
                  x2={W - pad.end}
                  y1={y(i)}
                  y2={y(i)}
                  className="stroke-line"
                  strokeDasharray="2 4"
                />
                <text
                  x={pad.start - labelGap}
                  y={y(i) + labelRise}
                  textAnchor="end"
                  className="fill-muted"
                >
                  {formatInt(zone.from)} m
                </text>
              </g>
            ))}
            {rulerTicks(totalMs).map((t) => (
              <text
                key={t}
                x={x(t)}
                y={H - labelGap}
                textAnchor="middle"
                className="fill-muted"
              >
                {formatTick(t)}
              </text>
            ))}
            <line
              x1={pad.start}
              x2={pad.start}
              y1={pad.top}
              y2={H - pad.bottom}
              className="stroke-line-strong"
            />
            {points.slice(1).map((point, i) => (
              <line
                key={`${point.t}-${point.zone}`}
                x1={x(points[i].t)}
                y1={y(points[i].zone)}
                x2={x(point.t)}
                y2={y(point.zone)}
                strokeWidth={3}
                strokeLinecap="round"
                className={`stroke-(--c) ${STEP_TONE[point.kind]}`}
              />
            ))}
            {points.slice(1).map((point) => (
              <circle
                key={`${point.t}-${point.zone}`}
                cx={x(point.t)}
                cy={y(point.zone)}
                r={4}
                strokeWidth={2}
                className={`fill-(--c) stroke-case ${STEP_TONE[point.kind]}`}
              />
            ))}
          </svg>
          <figcaption className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-muted text-xs">
            {PROFILE_LEGEND.map(([kind, stage]) => (
              <span key={kind} className="flex items-center gap-1.5">
                <i
                  className={`h-0.75 w-3.5 rounded-sm bg-(--c) ${STEP_TONE[kind]}`}
                />
                {hood.stages[stage]}
              </span>
            ))}
            <span>{copy.seabed.axisNote}</span>
          </figcaption>
        </figure>
      ) : (
        <p className="text-sm">{copy.seabed.earlyEnd}</p>
      )}
      <dl className="flex flex-wrap gap-x-4.5 gap-y-1 border-line border-t pt-2.5 font-medium font-mono text-[13px]">
        {traceReceipt(copy.seabed.receipt, hood.status, trace).map(
          ([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted">{label}</dt>
              <dd dir="ltr">{value}</dd>
            </div>
          ),
        )}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={onSurface} className="min-h-11 px-4.5">
          {copy.surface}
          <ArrowUp aria-hidden="true" className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onReplay}
          className="min-h-11"
        >
          {copy.replay}
        </Button>
      </div>
    </div>
  );
}
