import { Turnstile } from "@marsidev/react-turnstile";
import { HUMAN_CHECK_COPY } from "#/constants/humanCheck.constants";
import { TURNSTILE_SITE_KEY } from "#/constants/session.constants";
import type { Lang } from "#/types/i18n.types";

interface HumanCheckProps {
  lang: Lang;
  failed: boolean;
  onVerified: (turnstileToken: string) => void;
  onError: () => void;
}

export function HumanCheck({
  lang,
  failed,
  onVerified,
  onError,
}: HumanCheckProps) {
  if (failed) {
    return (
      <p role="alert" className="text-muted text-sm">
        {HUMAN_CHECK_COPY[lang].failed}
      </p>
    );
  }
  return (
    <Turnstile
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onVerified}
      onError={onError}
      options={{ appearance: "interaction-only", language: lang }}
    />
  );
}
