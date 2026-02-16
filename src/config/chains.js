import { base, baseSepolia } from "wagmi/chains";

export { base, baseSepolia };

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 8453);
export const activeChain = chainId === 84532 ? baseSepolia : base;
export const SUPPORTED_CHAINS = [activeChain];
