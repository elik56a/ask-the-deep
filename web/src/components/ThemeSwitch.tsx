import { Button } from "#/components/ui/button";
import { THEME_SWITCH_COPY } from "#/constants/theme.constants";
import type { Lang } from "#/types/i18n.types";
import type { Theme } from "#/types/theme.types";

interface ThemeSwitchProps {
  lang: Lang;
  theme: Theme;
  onToggle: () => void;
}

export function ThemeSwitch({ lang, theme, onToggle }: ThemeSwitchProps) {
  const copy = THEME_SWITCH_COPY[lang];
  const label = theme === "dark" ? copy.toLight : copy.toDark;
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="text-muted"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        {theme === "dark" ? (
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </g>
        ) : (
          <path
            d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </Button>
  );
}
