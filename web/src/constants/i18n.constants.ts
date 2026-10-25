import type { Dir, Lang, LangSwitchCopy, PageCopy } from "#/types/i18n.types";

export const DEFAULT_LANG: Lang = "en";

export const LANG_STORAGE_KEY = "portfolio-chat:lang";

// `?lang=he` opens the page in Hebrew and is kept in step with the switch, so a link carries its language.
export const LANG_PARAM = "lang";

export const LANG_DIR: Record<Lang, Dir> = { en: "ltr", he: "rtl" };

export const OTHER_LANG: Record<Lang, Lang> = { en: "he", he: "en" };

// Set while the prerendered English waits for React to switch to another language; styles.css hides the page.
export const LANG_PENDING_ATTR = "data-lang-pending";

// Runs before first paint, picking the language as `useLang` does, so the layout never starts on the wrong side.
export const LANG_BOOT_SCRIPT = `try{var d=${JSON.stringify(LANG_DIR)},h=document.documentElement,l=new URLSearchParams(location.search).get(${JSON.stringify(LANG_PARAM)});if(!Object.hasOwn(d,l))l=JSON.parse(localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)}));if(Object.hasOwn(d,l)&&l!==${JSON.stringify(DEFAULT_LANG)}){h.lang=l;h.dir=d[l];h.setAttribute(${JSON.stringify(LANG_PENDING_ATTR)},"")}}catch(e){}`;

export const LANG_SWITCH_COPY: Record<Lang, LangSwitchCopy> = {
  en: { label: "עברית" },
  he: { label: "English" },
};

export const PAGE_COPY: Record<Lang, PageCopy> = {
  en: { title: "Eliyahu" },
  he: { title: "אליהו" },
};
