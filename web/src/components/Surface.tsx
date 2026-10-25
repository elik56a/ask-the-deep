import { LangSwitch } from "#/components/LangSwitch";
import { SurfaceHero } from "#/components/SurfaceHero";
import { PAGE_COPY } from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";
import type { DiveMode } from "#/types/sea.types";

interface SurfaceProps {
  lang: Lang;
  mode: DiveMode;
  asked: boolean;
  onToggleLang: () => void;
}

/** Above the water: the language switch and the hero, stepping aside once the dive starts. */
export function Surface({ lang, mode, asked, onToggleLang }: SurfaceProps) {
  return (
    <>
      <header
        inert={mode !== "rest"}
        className="pointer-events-none fixed inset-x-[max(16px,env(safe-area-inset-left,0px))] top-[calc(12px+env(safe-area-inset-top,0px))] z-20 flex items-center justify-end gap-2 transition-opacity duration-300 inert:opacity-0 lg:inset-x-8 [&>*]:pointer-events-auto"
      >
        <LangSwitch lang={lang} onToggle={onToggleLang} />
      </header>
      <section
        aria-label={PAGE_COPY[lang].title}
        inert={mode !== "rest" && mode !== "ascend"}
        className="relative h-svh transition-opacity duration-300 inert:opacity-0"
      >
        <SurfaceHero lang={lang} talked={asked} />
      </section>
    </>
  );
}
