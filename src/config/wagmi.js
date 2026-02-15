import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "./chains.js";

export const wagmiConfig = getDefaultConfig({
  appName: "DOJO",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "placeholder",
  chains: [base],
  ssr: false,
});
