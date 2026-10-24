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
  "min-h-10 gap-2.5 rounded-[10px] px-2.5 py-2 text-sm text-text focus:bg-text/7";

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
            className="min-h-10 px-3.5"
          >
            {copy.surface}
          </Button>
        )}
        {side && (
          <>
            <Button
              variant="outline"
              onClick={onLand}
              className="me-auto min-h-10 px-3.5"
            >
              {copy.seabed}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={copy.minimize}
              onClick={onMinimize}
              className="size-10 rounded-[10px]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8h9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </>
        )}
        {talked ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={copy.menu}
                className="size-10 rounded-[10px] aria-expanded:border-glow aria-expanded:text-glow"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="13" cy="8" r="1.5" fill="currentColor" />
                </svg>
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
                onSelect={(event) => event.preventDefault()}
                className={`${ITEM} pe-2.5 [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden`}
              >
                <span
                  aria-hidden="true"
                  className={`relative h-4.5 w-8 flex-none rounded-full transition-colors duration-200 ${stayAtSurface ? "bg-glow" : "bg-line-strong"}`}
                >
                  <span
                    className={`absolute start-0.5 top-0.5 size-3.5 rounded-full transition-transform duration-200 ease-out ${stayAtSurface ? "translate-x-3.5 bg-on-accent rtl:-translate-x-3.5" : "bg-text"}`}
                  />
                </span>
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
