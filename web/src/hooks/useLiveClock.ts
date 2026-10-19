import { useEffect, useState } from "react";

/** Milliseconds since `running` turned true, updated every frame until it turns false. */
export function useLiveClock(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick() {
      setElapsed(performance.now() - start);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return elapsed;
}
