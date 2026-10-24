import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SOURCE_COPY } from "#/constants/source.constants";
import type { Citation } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";

interface SourceTipProps {
  id: string;
  lang: Lang;
  citation: Citation;
  /** The chip it explains: the tip sits above it, or below when there is no room. */
  anchor: DOMRect;
}

const EDGE = 12;
const GAP = 8;

export function SourceTip({ id, lang, citation, anchor }: SourceTipProps) {
  const tip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = tip.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const x = Math.min(
      Math.max(anchor.left + anchor.width / 2 - w / 2, EDGE),
      innerWidth - w - EDGE,
    );
    const above = anchor.top - h - GAP;
    setAt({ x, y: above < EDGE ? anchor.bottom + GAP : above });
  }, [anchor]);

  // In the body, so the scrolling source row and the chat's backdrop filter can't clip or offset it
  return createPortal(
    <div
      ref={tip}
      id={id}
      role="tooltip"
      style={at ? { left: at.x, top: at.y } : { visibility: "hidden" }}
      className="tip-in pointer-events-none fixed z-60 flex w-max max-w-[min(320px,calc(100vw-24px))] flex-col gap-1.5 rounded-xl border border-line-strong bg-[color-mix(in_oklab,var(--color-surface)_97%,var(--color-text))] px-3 py-2.5 text-[13px] text-text leading-normal shadow-[0_16px_40px_-16px_var(--color-case)]"
    >
      <cite
        dir="ltr"
        className="font-medium font-mono text-[11px] text-glow not-italic leading-[1.3] [overflow-wrap:anywhere]"
      >
        {citation.chunk_id}
      </cite>
      <span dir="auto">{citation.excerpt}</span>
      <small className="text-[11px] text-muted">{SOURCE_COPY[lang].open}</small>
    </div>,
    document.body,
  );
}
