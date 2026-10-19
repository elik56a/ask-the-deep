import type { ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
}

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <p className="font-mono text-[11px] text-muted uppercase leading-none tracking-[0.12em]">
      {children}
    </p>
  );
}
