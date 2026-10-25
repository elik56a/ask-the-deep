import { File } from "lucide-react";
import { useId } from "react";
import { SourceTip } from "#/components/SourceTip";
import { SOURCE_COPY } from "#/constants/source.constants";
import type { Citation } from "#/generated/events.gen";
import { useSourceTip } from "#/hooks/useSourceTip";
import type { Lang } from "#/types/i18n.types";
import { sourceUrl } from "#/utils/source.utils";

interface SourceChipsProps {
  lang: Lang;
  citations: Citation[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function SourceChips({
  lang,
  citations,
  focusChunk,
  onFocusChunk,
}: SourceChipsProps) {
  const tipId = useId();
  const { tip, show, hide } = useSourceTip(onFocusChunk);
  if (citations.length === 0) return null;

  return (
    <div
      onScroll={hide}
      className="flex gap-1.5 overflow-x-auto [mask-image:linear-gradient(90deg,black_calc(100%-24px),transparent)] [scrollbar-width:none] rtl:[mask-image:linear-gradient(270deg,black_calc(100%-24px),transparent)]"
    >
      {citations.map((citation) => (
        <a
          key={citation.chunk_id}
          href={sourceUrl(citation)}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={tip?.citation === citation ? tipId : undefined}
          onPointerEnter={(event) => show(citation, event.currentTarget)}
          onPointerLeave={hide}
          onFocus={(event) => show(citation, event.currentTarget)}
          onBlur={hide}
          data-focus={focusChunk === citation.chunk_id || undefined}
          className="inline-flex min-h-7.5 flex-none items-center gap-1.5 whitespace-nowrap rounded-lg border border-line py-1 ps-2 pe-2.5 text-muted text-xs no-underline outline-glow transition-[border-color,color,background-color] duration-150 hover:border-glow hover:bg-glow/14 hover:text-text focus-visible:outline-2 data-focus:border-glow data-focus:text-text pointer-coarse:min-h-11"
        >
          <File aria-hidden="true" className="size-3.25 flex-none text-glow" />
          <span dir="auto">{citation.breadcrumb}</span>
          <span className="sr-only">{SOURCE_COPY[lang].opens}</span>
        </a>
      ))}
      {tip && (
        <SourceTip
          id={tipId}
          lang={lang}
          citation={tip.citation}
          anchor={tip.anchor}
        />
      )}
    </div>
  );
}
