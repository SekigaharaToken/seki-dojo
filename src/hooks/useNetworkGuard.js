import { useAccount, useSwitchChain } from "wagmi";
import { base } from "@/config/chains.js";

/**
 * Guards against wrong network. Returns isWrongNetwork flag
 * and a switchToBase function to prompt chain switch.
 */
export function useNetworkGuard() {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== base.id;

  function switchToBase() {
    switchChain({ chainId: base.id });
  }

  return { isWrongNetwork, switchToBase };
}
