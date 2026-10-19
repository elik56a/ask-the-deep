import type { Lang } from "#/types/i18n.types";
import type { Theme, ThemeSwitchCopy } from "#/types/theme.types";

export const DEFAULT_THEME: Theme = "dark";

export const THEME_STORAGE_KEY = "portfolio-chat:theme";

export const OTHER_THEME: Record<Theme, Theme> = {
  dark: "light",
  light: "dark",
};

// Runs before first paint so a saved light theme never flashes dark.
export const THEME_BOOT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const THEME_SWITCH_COPY: Record<Lang, ThemeSwitchCopy> = {
  en: { toLight: "Switch to light theme", toDark: "Switch to dark theme" },
  he: { toLight: "מעבר לתצוגה בהירה", toDark: "מעבר לתצוגה כהה" },
};
