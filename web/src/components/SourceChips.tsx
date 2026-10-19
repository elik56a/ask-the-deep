import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import type { Citation } from "#/generated/events.gen";

interface SourceChipsProps {
  citations: Citation[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

export function SourceChips({
  citations,
  focusChunk,
  onFocusChunk,
}: SourceChipsProps) {
  if (citations.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {citations.map((citation, index) => (
        <li key={citation.chunk_id}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onPointerEnter={() => onFocusChunk(citation.chunk_id)}
                onPointerLeave={() => onFocusChunk(null)}
                onFocus={() => onFocusChunk(citation.chunk_id)}
                onBlur={() => onFocusChunk(null)}
                className={`inline-flex items-center gap-1.5 rounded-full border py-1 ps-1 pe-2.5 text-[13px] transition-colors duration-150 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent data-open:border-accent data-open:bg-accent/10 ${focusChunk === citation.chunk_id ? "border-accent bg-accent/10" : "border-line-strong"}`}
              >
                <span className="rounded-full bg-sunk px-1.5 py-0.5 font-mono font-semibold text-[11px] leading-none">
                  {index + 1}
                </span>
                <span dir="auto">{citation.breadcrumb}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 gap-2 p-3">
              <p
                dir="ltr"
                className="truncate text-start font-mono text-muted text-xs"
              >
                {citation.chunk_id}
              </p>
              <blockquote
                dir="auto"
                className="border-accent border-s-2 ps-3 text-sm leading-relaxed"
              >
                {citation.excerpt}
              </blockquote>
            </PopoverContent>
          </Popover>
        </li>
      ))}
    </ul>
  );
}
