import { Eyebrow } from "#/components/Eyebrow";
import { HOOD_COPY } from "#/constants/hood.constants";
import type { Lang } from "#/types/i18n.types";
import type { TraceTotals } from "#/types/trace.types";
import { formatInt, formatMs, formatUsd } from "#/utils/format.utils";

interface HoodMetersProps {
  totals: TraceTotals;
  lang: Lang;
}

export function HoodMeters({ totals, lang }: HoodMetersProps) {
  const copy = HOOD_COPY[lang].meters;
  const meters = [
    [copy.calls, String(totals.modelCalls)],
    [
      copy.tokens,
      `${formatInt(totals.inputTokens)} / ${formatInt(totals.outputTokens)}`,
    ],
    [copy.cost, formatUsd(totals.costUsd)],
    [copy.firstWord, totals.ttftMs === null ? "—" : formatMs(totals.ttftMs)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
      {meters.map(([label, value]) => (
        <div
          key={label}
          className="flex min-w-0 flex-col gap-2 border-line px-4 first:ps-0 sm:border-s sm:first:border-s-0"
        >
          <dt>
            <Eyebrow>{label}</Eyebrow>
          </dt>
          <dd
            dir="ltr"
            className="text-start font-medium font-mono text-xl tabular-nums leading-tight"
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
