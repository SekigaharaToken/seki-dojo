import { useAccount } from "wagmi";
import { useFarcaster } from "@/hooks/useFarcaster.js";

/**
 * Unified wallet address hook.
 * Returns an address from wagmi (preferred) or Farcaster custody/verification.
 * `canTransact` is true only when a wagmi wallet is connected (required for signing).
 */
export function useWalletAddress() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { isAuthenticated, profile } = useFarcaster();

  const canTransact = !!(wagmiConnected && wagmiAddress);

  if (canTransact) {
    return { address: wagmiAddress, isConnected: true, canTransact: true };
  }

  if (isAuthenticated && profile) {
    const farcasterAddress =
      profile.custody || (profile.verifications && profile.verifications[0]);
    if (farcasterAddress) {
      return { address: farcasterAddress, isConnected: true, canTransact: false };
    }
  }

  return { address: null, isConnected: false, canTransact: false };
}
