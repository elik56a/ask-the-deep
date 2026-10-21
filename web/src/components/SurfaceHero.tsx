import { CHAT_COPY } from "#/constants/chat.constants";
import type { Lang } from "#/types/i18n.types";

interface SurfaceHeroProps {
  lang: Lang;
}

export function SurfaceHero({ lang }: SurfaceHeroProps) {
  const copy = CHAT_COPY[lang];
  const [before, name, after] = copy.introTitle;
  return (
    <div className="absolute start-[max(16px,6vw)] top-[max(15svh,120px)] sm:top-[max(15svh,92px)] flex w-[min(640px,calc(100%-32px))] flex-col gap-3.5 text-ink">
      <h1 className="text-balance font-display font-light font-stretch-expanded text-hero leading-[0.98] tracking-[-0.035em]">
        {before}
        <em className="font-extrabold not-italic">{name}</em>
        {after}
      </h1>
      <p className="max-w-[42ch] text-pretty text-ink/82 text-lg max-sm:hidden">
        {copy.introBody}
      </p>
    </div>
  );
}
