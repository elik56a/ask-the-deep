import { LANG_DIR, LANG_PARAM } from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && Object.hasOwn(LANG_DIR, value);
}

/** The language a URL's query asks for, if it names a supported one. */
export function langFromSearch(search: string): Lang | null {
  const value = new URLSearchParams(search).get(LANG_PARAM);
  return isLang(value) ? value : null;
}

/** The query with its language set to `lang`, every other parameter kept. */
export function searchWithLang(search: string, lang: Lang): string {
  const params = new URLSearchParams(search);
  params.set(LANG_PARAM, lang);
  return `?${params}`;
}
