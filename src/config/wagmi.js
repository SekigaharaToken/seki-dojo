import { createConfig, http } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { activeChain } from "./chains.js";

/**
 * Detect if running inside an iframe (Farcaster MiniApp context).
 */
function isInIframe() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "placeholder";

const rainbowConnectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: "DOJO",
    projectId,
  },
);

const connectors = isInIframe()
  ? [farcasterMiniApp(), ...rainbowConnectors]
  : rainbowConnectors;

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors,
  transports: {
    [activeChain.id]: http(),
  },
  ssr: false,
});
