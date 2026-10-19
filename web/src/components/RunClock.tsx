import { Eyebrow } from "#/components/Eyebrow";
import { useLiveClock } from "#/hooks/useLiveClock";

interface RunClockProps {
  running: boolean;
  finalMs: number;
  label: string;
}

export function RunClock({ running, finalMs, label }: RunClockProps) {
  const live = useLiveClock(running);
  const ms = running ? live : finalMs;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <p
        dir="ltr"
        className="font-medium font-mono text-display tabular-nums leading-none tracking-tighter"
      >
        {(ms / 1000).toFixed(3)}
        <span className="ms-1 text-base text-muted">s</span>
      </p>
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}
