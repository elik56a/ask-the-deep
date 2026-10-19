import type { StorageKind } from "#/types/storage.types";

// Looked up inside try: the global is missing during prerender and can
// throw when the browser blocks site data.
function storage(kind: StorageKind): Storage {
  return kind === "local" ? localStorage : sessionStorage;
}

export function loadStored<T>(
  kind: StorageKind,
  key: string,
  isValid: (value: unknown) => value is T,
): T | undefined {
  try {
    const raw = storage(kind).getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    return isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveStored(
  kind: StorageKind,
  key: string,
  value: unknown,
): void {
  try {
    storage(kind).setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the chat still works.
  }
}
