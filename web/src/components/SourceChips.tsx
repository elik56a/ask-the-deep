import { Button } from "#/components/ui/button";
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
              <Button
                variant="outline"
                size="sm"
                onPointerEnter={() => onFocusChunk(citation.chunk_id)}
                onPointerLeave={() => onFocusChunk(null)}
                onFocus={() => onFocusChunk(citation.chunk_id)}
                onBlur={() => onFocusChunk(null)}
                className={`h-auto gap-1.5 rounded-full py-1 ps-1 pe-2.5 font-normal text-[13px] hover:border-accent aria-expanded:border-accent aria-expanded:bg-accent/10 ${focusChunk === citation.chunk_id ? "border-accent bg-accent/10" : ""}`}
              >
                <span className="rounded-full bg-sunk px-1.5 py-0.5 font-mono font-semibold text-[11px] leading-none">
                  {index + 1}
                </span>
                <span dir="auto">{citation.breadcrumb}</span>
              </Button>
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
