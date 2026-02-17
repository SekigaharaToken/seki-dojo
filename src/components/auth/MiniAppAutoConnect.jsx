import { useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "@/hooks/useMiniAppContext.js";

/**
 * Auto-connects the Farcaster wallet when running inside a MiniApp iframe.
 * Finds the farcasterMiniApp connector from the wagmi config and connects it.
 * On reload, wagmi's built-in reconnect handles persistence automatically
 * since the connector is registered in the config.
 */
export function MiniAppAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const { isInMiniApp } = useMiniAppContext();
  const attemptedRef = useRef(false);

  // Call ready() as early as possible to dismiss the splash screen.
  // This must not be gated on isInMiniApp (which resolves async).
  const readyCalledRef = useRef(false);
  useEffect(() => {
    if (readyCalledRef.current) return;
    readyCalledRef.current = true;
    sdk.actions.ready();
  }, []);

  // Auto-connect the Farcaster wallet once context resolves.
  useEffect(() => {
    if (attemptedRef.current || isConnected || !isInMiniApp) return;
    attemptedRef.current = true;

    const farcasterConnector = connectors.find(
      (c) => c.id === "farcaster" || c.name === "Farcaster",
    );

    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  }, [connect, connectors, isConnected, isInMiniApp]);

  return null;
}
