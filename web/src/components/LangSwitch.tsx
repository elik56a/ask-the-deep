import { LANG_SWITCH_COPY, OTHER_LANG } from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";

interface LangSwitchProps {
  lang: Lang;
  onToggle: () => void;
}

export function LangSwitch({ lang, onToggle }: LangSwitchProps) {
  const copy = LANG_SWITCH_COPY[lang];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={copy.ariaLabel}
      className="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span lang={OTHER_LANG[lang]}>{copy.label}</span>
    </button>
  );
}
