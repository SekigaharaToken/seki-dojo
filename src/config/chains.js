/**
 * Chain config — inlined from engine to avoid barrel import issues in scripts.
 */
import { base, baseSepolia } from "viem/chains";

const chainId = Number(import.meta.env?.VITE_CHAIN_ID ?? process.env?.VITE_CHAIN_ID ?? "8453");
export const activeChain = chainId === 84532 ? baseSepolia : base;
export const SUPPORTED_CHAINS = [activeChain];
