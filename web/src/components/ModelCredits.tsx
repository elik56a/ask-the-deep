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
    <details className="glass fixed end-[max(16px,env(safe-area-inset-right,0px))] top-[calc(64px+env(safe-area-inset-top,0px))] sm:top-auto sm:bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-14 max-w-[min(360px,calc(100%-32px))] rounded-xl px-3 py-1.5 text-muted text-xs">
      <summary className="flex min-h-7 cursor-pointer items-center">
        {copy.summary}
      </summary>
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
    </details>
  );
}
