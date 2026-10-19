import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "ok" | "warn";
}

export function Badge({ children, tone }: BadgeProps) {
  const color =
    tone === "ok"
      ? "bg-sunk text-ok"
      : tone === "warn"
        ? "bg-warn/15 text-warn"
        : "bg-sunk text-muted";
  return (
    <span
      dir="auto"
      className={`rounded-md px-1.5 py-1 font-medium font-mono text-[11px] tabular-nums leading-none ${color}`}
    >
      {children}
    </span>
  );
}
