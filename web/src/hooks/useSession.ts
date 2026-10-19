import { useCallback, useEffect, useState } from "react";
import { SESSION_STORAGE_KEY } from "#/constants/session.constants";
import type { Session } from "#/types/session.types";
import { isSession, isUsable, startSession } from "#/utils/session.utils";
import { loadStored, saveStored } from "#/utils/storage.utils";

export function useSession() {
  const [session, setSession] = useState<Session>();
  const [failed, setFailed] = useState(false);

  // Read storage after mount so the prerendered HTML and first render match.
  useEffect(() => {
    setSession(loadStored("session", SESSION_STORAGE_KEY, isSession));
  }, []);

  const verify = useCallback(async (turnstileToken: string) => {
    try {
      const next = await startSession(turnstileToken, Date.now());
      saveStored("session", SESSION_STORAGE_KEY, next);
      setSession(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  const fail = useCallback(() => setFailed(true), []);
  const reset = useCallback(() => setSession(undefined), []);

  const token = isUsable(session, Date.now()) ? session.token : undefined;
  return { token, failed, verify, fail, reset };
}
