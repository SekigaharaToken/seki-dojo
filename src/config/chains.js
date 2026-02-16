import { base, baseSepolia } from "wagmi/chains";
import { getEnv } from "./env.js";

export { base, baseSepolia };

const chainId = Number(getEnv("VITE_CHAIN_ID", "8453"));
export const activeChain = chainId === 84532 ? baseSepolia : base;
export const SUPPORTED_CHAINS = [activeChain];
