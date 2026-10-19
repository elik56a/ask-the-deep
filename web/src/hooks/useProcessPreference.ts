import { useCallback, useEffect, useState } from "react";
import { PROCESS_STORAGE_KEY } from "#/constants/hood.constants";
import { loadStored, saveStored } from "#/utils/storage.utils";

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Whether the visitor wants the under-the-hood panel; on unless they turned it off. */
export function useProcessPreference() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(loadStored("local", PROCESS_STORAGE_KEY, isBoolean) ?? true);
  }, []);

  const change = useCallback((next: boolean) => {
    saveStored("local", PROCESS_STORAGE_KEY, next);
    setShow(next);
  }, []);

  return { show, change };
}
