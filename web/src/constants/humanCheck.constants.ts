import type { HumanCheckCopy } from "#/types/humanCheck.types";
import type { Lang } from "#/types/i18n.types";

export const HUMAN_CHECK_COPY: Record<Lang, HumanCheckCopy> = {
  en: { failed: "The human check failed. Refresh the page to try again." },
  he: { failed: "בדיקת האנושיות נכשלה. אפשר לרענן את הדף ולנסות שוב." },
};
