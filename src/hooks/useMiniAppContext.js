import { useState, useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";

/**
 * Wraps sdk.context in a React hook. Resolves the promise once
 * and provides derived booleans for common checks.
 */
export function useMiniAppContext() {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    sdk.context
      .then((ctx) => {
        if (ctx) setContext(ctx);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const isInMiniApp = context !== null;
  const isAppAdded = context?.client?.added ?? false;
  const hasNotifications = context?.client?.notificationDetails != null;

  return { context, isInMiniApp, isAppAdded, hasNotifications, isLoading };
}
