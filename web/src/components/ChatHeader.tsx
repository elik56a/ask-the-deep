import { Ellipsis, Minus } from "lucide-react";
import { Avatar } from "#/components/Avatar";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Switch } from "#/components/ui/switch";
import { CHAT_COPY } from "#/constants/chat.constants";
import { LANG_DIR } from "#/constants/i18n.constants";
import type { ChatState } from "#/types/chat.types";
import type { Lang } from "#/types/i18n.types";

interface ChatHeaderProps {
  lang: Lang;
  /** At the seabed; null at the surface. */
  state: ChatState | null;
  talked: boolean;
  stayAtSurface: boolean;
  onStayAtSurface: (stay: boolean) => void;
  onNewConversation: () => void;
  onSurface: () => void;
  onReread: () => void;
  onLand: () => void;
  onMinimize: () => void;
}

const ITEM =
  "min-h-10 gap-2.5 rounded-[10px] px-2.5 py-2 pointer-coarse:min-h-11 text-sm text-text focus:bg-text/7";

/**
 * One header row: the agent, Surface (at the seabed), and a ⋯ menu for the rarely used controls.
 * Before the first question the menu's only live item, the switch, sits inline instead.
 */
export function ChatHeader({
  lang,
  state,
  talked,
  stayAtSurface,
  onStayAtSurface,
  onNewConversation,
  onSurface,
  onReread,
  onLand,
  onMinimize,
}: ChatHeaderProps) {
  const copy = CHAT_COPY[lang];
  const side = state === "side";
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 ${talked ? "-mx-4.5 border-line border-b px-4.5 pb-3.5" : ""}`}
    >
      <p className="inline-flex items-center gap-2 text-[0.8125rem] text-muted">
        <Avatar label={copy.agentAvatar} badge={false} small />
        {copy.agentLabel}
      </p>
      <div
        className={`ms-auto flex items-center gap-1.5 ${side ? "w-full" : ""}`}
      >
        {state === "full" && (
          <Button
            variant="outline"
            onClick={onSurface}
            className="min-h-10 px-3.5 pointer-coarse:min-h-11"
          >
            {copy.surface}
          </Button>
        )}
        {side && (
          <>
            <Button
              variant="outline"
              onClick={onLand}
              className="me-auto min-h-10 px-3.5 pointer-coarse:min-h-11"
            >
              {copy.seabed}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={copy.minimize}
              onClick={onMinimize}
              className="size-10 rounded-[10px] pointer-coarse:size-11"
            >
              <Minus aria-hidden="true" className="size-4" />
            </Button>
          </>
        )}
        {talked ? (
          <DropdownMenu dir={LANG_DIR[lang]}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={copy.menu}
                className="size-10 rounded-[10px] pointer-coarse:size-11 aria-expanded:border-glow aria-expanded:text-glow"
              >
                <Ellipsis aria-hidden="true" className="size-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-auto min-w-62.5 rounded-[14px] border border-line-strong bg-[color-mix(in_oklab,var(--color-surface)_97%,var(--color-text))] p-1.5 shadow-[0_20px_50px_-20px_var(--color-case)] ring-0"
            >
              {state && (
                <DropdownMenuItem onSelect={onReread} className={ITEM}>
                  {copy.reread}
                </DropdownMenuItem>
              )}
              <DropdownMenuCheckboxItem
                checked={stayAtSurface}
                onCheckedChange={onStayAtSurface}
                className={`${ITEM} pe-2.5 [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden`}
              >
                <Switch
                  checked={stayAtSurface}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none"
                />
                <span>
                  {copy.stayAtSurface}
                  <small className="block text-muted text-xs">
                    {copy.stayHint}
                  </small>
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem onSelect={onNewConversation} className={ITEM}>
                {copy.newConversation}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <label
            htmlFor="stay-at-surface"
            className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.8125rem] text-muted has-data-checked:text-text"
          >
            <Switch
              id="stay-at-surface"
              checked={stayAtSurface}
              onCheckedChange={onStayAtSurface}
            />
            {copy.stayAtSurface}
          </label>
        )}
      </div>
    </div>
  );
}
