import { useRef } from "react";
import { useMovement } from "#/hooks/useMovement";
import type { TraceSpan } from "#/types/trace.types";

interface MovementProps {
  spans: TraceSpan[];
  running: boolean;
}

export function Movement({ spans, running }: MovementProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useMovement(canvas, spans, running);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_90%_at_62%_55%,color-mix(in_oklab,var(--color-accent)_8%,var(--color-case))_0%,var(--color-case)_75%)] after:absolute after:inset-0 after:bg-linear-to-b after:from-case/80 after:via-transparent after:via-40% after:to-case/90"
    >
      <canvas ref={canvas} className="block size-full" />
    </div>
  );
}
