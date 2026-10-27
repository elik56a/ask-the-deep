import { X } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import {
  MODEL_CREDITS,
  MODEL_CREDITS_COPY,
  MODEL_LICENSE,
} from "#/constants/models.constants";
import type { Lang } from "#/types/i18n.types";

interface ModelCreditsProps {
  lang: Lang;
}

export function ModelCredits({ lang }: ModelCreditsProps) {
  const copy = MODEL_CREDITS_COPY[lang];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="glass fixed end-[max(16px,env(safe-area-inset-right,0px))] top-[calc(64px+env(safe-area-inset-top,0px))] sm:top-auto sm:bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-14 h-auto min-h-10 rounded-xl px-3 font-normal text-muted text-xs hover:bg-text/7 hover:text-text pointer-coarse:min-h-11"
        >
          {copy.summary}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="glass relative block max-h-(--radix-popover-content-available-height) w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-xl p-3 pt-2 text-muted text-xs shadow-none ring-0"
      >
        <PopoverClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copy.close}
            className="float-end -me-1.5 pointer-coarse:size-11 hover:bg-text/7"
          >
            <X aria-hidden="true" />
          </Button>
        </PopoverClose>
        <p className="py-1.5 text-text">{copy.summary}</p>
        <ul className="my-1.5 flex list-disc flex-col gap-1 ps-4">
          {MODEL_CREDITS.map((credit) => (
            <li key={credit.id}>
              <a
                href={credit.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text underline-offset-2 hover:underline"
              >
                {credit.title}
              </a>{" "}
              {copy.by} {credit.author}
              {credit.cc0 && " (CC0)"}
            </li>
          ))}
        </ul>
        <p className="mb-1">
          {copy.license[0]}
          <a
            href={MODEL_LICENSE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text underline-offset-2 hover:underline"
          >
            {MODEL_LICENSE.name}
          </a>
          {copy.license[1]}
        </p>
      </PopoverContent>
    </Popover>
  );
}
