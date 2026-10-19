export function loadFromSession<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    return isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveToSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the chat still works.
  }
}
