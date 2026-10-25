import type { Dir, Lang, LangSwitchCopy, PageCopy } from "#/types/i18n.types";

export const DEFAULT_LANG: Lang = "en";

export const LANG_STORAGE_KEY = "portfolio-chat:lang";

// `?lang=he` opens the page in Hebrew and is kept in step with the switch, so a link carries its language.
export const LANG_PARAM = "lang";

export const LANG_DIR: Record<Lang, Dir> = { en: "ltr", he: "rtl" };

export const OTHER_LANG: Record<Lang, Lang> = { en: "he", he: "en" };

export const LANG_SWITCH_COPY: Record<Lang, LangSwitchCopy> = {
  en: { label: "עברית" },
  he: { label: "English" },
};

export const PAGE_COPY: Record<Lang, PageCopy> = {
  en: { title: "Eliyahu" },
  he: { title: "אליהו" },
};
