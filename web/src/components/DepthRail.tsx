import { DIVE_COPY, RAIL_TICKS, ZONES } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";
import { metersToPx } from "#/utils/depth.utils";
import { formatInt } from "#/utils/format.utils";

interface DepthRailProps {
  lang: Lang;
}

const ticks = ZONES.flatMap((zone) =>
  Array.from(
    { length: RAIL_TICKS },
    (_, i) => zone.from + ((zone.to - zone.from) * (i + 1)) / (RAIL_TICKS + 1),
  ),
);

export function DepthRail({ lang }: DepthRailProps) {
  const copy = DIVE_COPY[lang];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-y-0 start-14 w-px bg-linear-to-b from-transparent to-line-strong to-[40px]" />
      {ticks.map((meters) => (
        <span
          key={meters}
          dir="ltr"
          className="absolute start-0 flex w-14 -translate-y-1/2 items-center justify-end gap-1.5 font-mono text-[10px] text-muted tabular-nums leading-none after:h-px after:w-1.5 after:bg-line-strong"
          style={{ top: metersToPx(meters) }}
        >
          {formatInt(meters)}
        </span>
      ))}
      {ZONES.map((zone) => (
        <div
          key={zone.id}
          className="absolute inset-x-0 start-14 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-line border-t border-dashed ps-7 pt-2"
          style={{ top: metersToPx(zone.from) }}
        >
          <b className="font-bold font-display font-stretch-expanded text-xl leading-none tracking-[-0.01em]">
            {copy.zones[zone.id]}
          </b>
          <span dir="ltr" className="font-mono text-[11px] text-muted">
            {formatInt(zone.from)}–{formatInt(zone.to)} m
          </span>
        </div>
      ))}
    </div>
  );
}
