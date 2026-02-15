/**
 * SIWF (Sign In With Farcaster) state machine.
 *
 * Adapted from SecondOrder (commit 87e0d786).
 * Simplified: No backend verification — DOJO uses wallet address directly.
 * Manages: nonce generation, channel creation, QR polling, success/error.
 */

import { useRef, useCallback, useState, useEffect } from "react";
import { useSignIn } from "@farcaster/auth-kit";
import { useFarcaster } from "@/hooks/useFarcaster.js";

export const useFarcasterSignIn = ({ onSuccess, onError } = {}) => {
  const { generateNonce } = useFarcaster();

  const [wantsToSignIn, setWantsToSignIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQrView, setShowQrView] = useState(false);

  const nonceRef = useRef(null);

  const handleSuccess = useCallback(
    (res) => {
      setWantsToSignIn(false);
      setShowQrView(false);
      onSuccess?.(res);
    },
    [onSuccess],
  );

  const handleError = useCallback(
    (error) => {
      setWantsToSignIn(false);
      setIsConnecting(false);
      setShowQrView(false);
      onError?.(error);
    },
    [onError],
  );

  const nonceGetter = useCallback(async () => {
    const nonce = generateNonce();
    nonceRef.current = nonce;
    return nonce;
  }, [generateNonce]);

  const {
    signIn,
    connect,
    reconnect,
    isPolling,
    channelToken,
    url,
    isError,
  } = useSignIn({
    nonce: nonceGetter,
    onSuccess: handleSuccess,
    onError: handleError,
    timeout: 300000,
    interval: 1500,
  });

  // Once the channel is created, start polling and show QR
  useEffect(() => {
    if (wantsToSignIn && channelToken && !isPolling) {
      signIn();
      setIsConnecting(false);
      setShowQrView(true);
    }
  }, [wantsToSignIn, channelToken, isPolling, signIn]);

  const handleSignInClick = useCallback(() => {
    setWantsToSignIn(true);
    setIsConnecting(true);
    if (isError) {
      reconnect();
    } else {
      connect();
    }
  }, [connect, reconnect, isError]);

  const handleCancel = useCallback(() => {
    setShowQrView(false);
    setWantsToSignIn(false);
  }, []);

  const isLoading = isConnecting && !isPolling;

  return {
    handleSignInClick,
    handleCancel,
    isConnecting,
    isPolling,
    showQrView,
    url,
    isLoading,
  };
};
