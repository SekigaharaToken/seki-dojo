import { useAccount, useSwitchChain } from "wagmi";
import { activeChain } from "@/config/chains.js";

/**
 * Guards against wrong network. Returns isWrongNetwork flag
 * and a switchToBase function to prompt chain switch.
 */
export function useNetworkGuard() {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== activeChain.id;

  function switchToBase() {
    switchChain({ chainId: activeChain.id });
  }

  return { isWrongNetwork, switchToBase };
}
