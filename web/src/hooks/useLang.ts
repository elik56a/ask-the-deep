import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LANG,
  LANG_DIR,
  LANG_PENDING_ATTR,
  LANG_STORAGE_KEY,
  OTHER_LANG,
} from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";
import { isLang, langFromSearch, searchWithLang } from "#/utils/i18n.utils";
import { loadStored, saveStored } from "#/utils/storage.utils";

const showInUrl = (lang: Lang) =>
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${searchWithLang(location.search, lang)}${location.hash}`,
  );

/** The page language: `?lang=` first, then the visitor's last choice; the URL follows the switch. */
export function useLang() {
  // Unset until read after mount, so the first render matches the prerendered English
  // without undoing the direction LANG_BOOT_SCRIPT already set.
  const [chosen, setLang] = useState<Lang>();
  const lang = chosen ?? DEFAULT_LANG;

  useEffect(() => {
    const first =
      langFromSearch(location.search) ??
      loadStored("local", LANG_STORAGE_KEY, isLang) ??
      DEFAULT_LANG;
    setLang(first);
    showInUrl(first);
  }, []);

  useEffect(() => {
    if (!chosen) return;
    const root = document.documentElement;
    root.lang = chosen;
    root.dir = LANG_DIR[chosen];
    root.removeAttribute(LANG_PENDING_ATTR);
  }, [chosen]);

  const toggle = useCallback(() => {
    const next = OTHER_LANG[lang];
    saveStored("local", LANG_STORAGE_KEY, next);
    setLang(next);
    showInUrl(next);
  }, [lang]);

  return { lang, toggle };
}
