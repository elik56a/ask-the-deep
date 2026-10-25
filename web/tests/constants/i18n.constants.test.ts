import { expect, it } from "vitest";
import {
  LANG_BOOT_SCRIPT,
  LANG_PENDING_ATTR,
  LANG_STORAGE_KEY,
} from "#/constants/i18n.constants";

function boot(search: string, stored: string | null) {
  const attrs: Record<string, string> = {};
  const root = {
    lang: "en",
    dir: "ltr",
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
  };
  const storage = {
    getItem: (key: string) => (key === LANG_STORAGE_KEY ? stored : null),
  };
  new Function("location", "localStorage", "document", LANG_BOOT_SCRIPT)(
    { search },
    storage,
    { documentElement: root },
  );
  return {
    lang: root.lang,
    dir: root.dir,
    pending: LANG_PENDING_ATTR in attrs,
  };
}

it("turns the page right-to-left before paint for Hebrew", () => {
  expect(boot("?lang=he", null)).toEqual({
    lang: "he",
    dir: "rtl",
    pending: true,
  });
  expect(boot("", '"he"')).toEqual({ lang: "he", dir: "rtl", pending: true });
});

it("lets the URL win over the stored choice, as useLang does", () => {
  expect(boot("?lang=en", '"he"')).toEqual({
    lang: "en",
    dir: "ltr",
    pending: false,
  });
});

it("leaves English and bad values alone", () => {
  for (const [search, stored] of [
    ["", null],
    ["?lang=fr", '"toString"'],
    ["", "not json"],
  ] as const) {
    expect(boot(search, stored)).toEqual({
      lang: "en",
      dir: "ltr",
      pending: false,
    });
  }
});
