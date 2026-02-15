/**
 * FarcasterProvider — React context for Farcaster SIWF state.
 *
 * Adapted from SecondOrder (commit 87e0d786).
 * Simplified: No backend JWT — DOJO is fully static/onchain.
 * Provides Farcaster profile state from auth-kit's useProfile().
 */

import { useMemo, useContext, useCallback, useState } from "react";
import { useProfile } from "@farcaster/auth-kit";
import FarcasterContext from "./farcasterContext.js";

export const FarcasterProvider = ({ children }) => {
  const { isAuthenticated, profile } = useProfile();
  const [error, setError] = useState(null);

  /**
   * Generate an alphanumeric nonce for SIWF.
   * SIWE (ERC-4361) nonces require [a-zA-Z0-9]{8+}.
   * UUID hyphens cause Warpcast to fail silently.
   */
  const generateNonce = useCallback(() => {
    return crypto.randomUUID().replaceAll("-", "");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      profile: profile || null,
      error,
      generateNonce,
      clearError,
    }),
    [isAuthenticated, profile, error, generateNonce, clearError],
  );

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
};
