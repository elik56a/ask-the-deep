import { LANG_DIR } from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && Object.hasOwn(LANG_DIR, value);
}
