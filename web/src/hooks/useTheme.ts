import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  OTHER_THEME,
  THEME_STORAGE_KEY,
} from "#/constants/theme.constants";
import type { Theme } from "#/types/theme.types";
import { saveStored } from "#/utils/storage.utils";
import { isTheme } from "#/utils/theme.utils";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // The boot script already applied the saved theme; read it back from the page.
  useEffect(() => {
    const applied = document.documentElement.dataset.theme;
    setTheme(isTheme(applied) ? applied : DEFAULT_THEME);
  }, []);

  const toggle = useCallback(() => {
    const next = OTHER_THEME[theme];
    document.documentElement.dataset.theme = next;
    saveStored("local", THEME_STORAGE_KEY, next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
