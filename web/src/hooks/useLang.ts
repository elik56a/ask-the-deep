import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LANG,
  LANG_DIR,
  LANG_STORAGE_KEY,
  OTHER_LANG,
} from "#/constants/i18n.constants";
import type { Lang } from "#/types/i18n.types";
import { isLang } from "#/utils/i18n.utils";
import { loadStored, saveStored } from "#/utils/storage.utils";

export function useLang() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLang(loadStored("local", LANG_STORAGE_KEY, isLang) ?? DEFAULT_LANG);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANG_DIR[lang];
  }, [lang]);

  const toggle = useCallback(() => {
    const next = OTHER_LANG[lang];
    saveStored("local", LANG_STORAGE_KEY, next);
    setLang(next);
  }, [lang]);

  return { lang, toggle };
}
