import { Button } from "#/components/ui/button";
import { LANG_SWITCH_COPY, OTHER_LANG } from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";

interface LangSwitchProps {
  lang: Lang;
  onToggle: () => void;
}

export function LangSwitch({ lang, onToggle }: LangSwitchProps) {
  const copy = LANG_SWITCH_COPY[lang];
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onToggle}
      aria-label={copy.ariaLabel}
    >
      <span lang={OTHER_LANG[lang]}>{copy.label}</span>
    </Button>
  );
}
