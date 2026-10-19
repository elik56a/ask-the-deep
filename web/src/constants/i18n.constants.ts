import type { Dir, Lang, LangSwitchCopy, PageCopy } from "#/types/i18n.types";

export const DEFAULT_LANG: Lang = "en";

export const LANG_STORAGE_KEY = "portfolio-chat:lang";

export const LANG_DIR: Record<Lang, Dir> = { en: "ltr", he: "rtl" };

export const OTHER_LANG: Record<Lang, Lang> = { en: "he", he: "en" };

export const LANG_SWITCH_COPY: Record<Lang, LangSwitchCopy> = {
  en: { label: "עברית", ariaLabel: "Switch to Hebrew" },
  he: { label: "English", ariaLabel: "החלפה לאנגלית" },
};

export const PAGE_COPY: Record<Lang, PageCopy> = {
  en: { title: "Eliyahu" },
  he: { title: "אליהו" },
};
