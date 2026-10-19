import type { Theme } from "#/types/theme.types";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
