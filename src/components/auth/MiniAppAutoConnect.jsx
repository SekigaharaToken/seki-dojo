import { useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";
import sdk from "@farcaster/miniapp-sdk";

/**
 * Auto-connects the Farcaster wallet when running inside a MiniApp iframe.
 * Finds the farcasterMiniApp connector from the wagmi config and connects it.
 * On reload, wagmi's built-in reconnect handles persistence automatically
 * since the connector is registered in the config.
 */
export function MiniAppAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || isConnected) return;
    attemptedRef.current = true;

    sdk.context
      .then((context) => {
        if (!context) return;

        const farcasterConnector = connectors.find(
          (c) => c.id === "farcaster" || c.name === "Farcaster",
        );

        if (farcasterConnector) {
          connect({ connector: farcasterConnector });
        }

        sdk.actions.ready();
      })
      .catch(() => {});
  }, [connect, connectors, isConnected]);

  return null;
}
