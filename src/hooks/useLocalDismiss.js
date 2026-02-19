import { useState, useCallback } from "react";

export function useLocalDismiss(key) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(key) === "true",
  );
  const dismiss = useCallback(() => {
    localStorage.setItem(key, "true");
    setDismissed(true);
  }, [key]);
  return [dismissed, dismiss];
}
