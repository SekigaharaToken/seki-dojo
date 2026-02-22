/**
 * DOJO-specific contract addresses and token config.
 * Engine-shared addresses (EAS, Mint Club, chains) come from @sekigahara/engine.
 *
 * getEnv is inlined here (instead of imported from engine) so that Node.js
 * scripts can import this file without triggering the engine barrel export,
 * which re-exports .jsx components that Node cannot parse.
 */

function getEnv(key, fallback = "") {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] ?? fallback;
  }
  return process.env[key] ?? fallback;
}

const chainId = Number(getEnv("VITE_CHAIN_ID", "8453"));

// EAS predeploy (same on all OP Stack chains)
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";

// Custom contracts (loaded from env — set after deployment)
export const DOJO_RESOLVER_ADDRESS =
  getEnv("VITE_DOJO_RESOLVER_ADDRESS", "");
// Lowercase hex — Base RPC topic filters are case-sensitive
const rawSchemaUid = getEnv("VITE_DOJO_SCHEMA_UID", "");
export const DOJO_SCHEMA_UID = rawSchemaUid ? rawSchemaUid.toLowerCase() : "";

// Project tokens (loaded from env — set after Mint Club creation)
export const SEKI_TOKEN_ADDRESS =
  getEnv("VITE_SEKI_TOKEN_ADDRESS", "");
export const DOJO_TOKEN_ADDRESS =
  getEnv("VITE_DOJO_TOKEN_ADDRESS", "");

// Mint Club V2 contract addresses (duplicated from engine for script access)
const MINT_CLUB_MAINNET = {
  BOND: "0xc5a076cad94176c2996B32d8466Be1cE757FAa27",
  ERC20: "0xAa70bC79fD1cB4a6FBA717018351F0C3c64B79Df",
  ERC1155: "0x6c61918eECcC306D35247338FDcf025af0f6120A",
  ZAP: "0x91523b39813F3F4E406ECe406D0bEAaA9dE251fa",
  LOCKER: "0xA3dCf3Ca587D9929d540868c924f208726DC9aB6",
  MERKLE: "0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4",
  STAKE: "0x9Ab05EcA10d087f23a1B22A44A714cdbBA76E802",
};
const MINT_CLUB_SEPOLIA = {
  BOND: "0xc5a076cad94176c2996B32d8466Be1cE757FAa27",
  ERC20: "0xAa70bC79fD1cB4a6FBA717018351F0C3c64B79Df",
  MERKLE: "0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4",
};
export const MINT_CLUB =
  chainId === 84532 ? MINT_CLUB_SEPOLIA : MINT_CLUB_MAINNET;

// Mint Club SDK network name matching chain ID
export const MINT_CLUB_NETWORK = chainId === 84532 ? "basesepolia" : "base";

// Placeholder token for swap UI until $DOJO bonding curve is live
// CATTBUTT on Base mainnet: https://mint.club/token/base/CATTBUTT
const PLACEHOLDER_SWAP_TOKEN = "0xC5aAEFD024Aa95C59712A931b3295e237fFD3f81";
const PLACEHOLDER_SWAP_NETWORK = "base";

// Use real $DOJO on mainnet; on testnet (or when unconfigured) use placeholder
const hasMainnetToken = DOJO_TOKEN_ADDRESS && chainId === 8453;
export const SWAP_TOKEN_ADDRESS = hasMainnetToken ? DOJO_TOKEN_ADDRESS : PLACEHOLDER_SWAP_TOKEN;
export const SWAP_NETWORK = hasMainnetToken ? MINT_CLUB_NETWORK : PLACEHOLDER_SWAP_NETWORK;

// Token configs for the swap UI tabs
const hasMainnetSeki = SEKI_TOKEN_ADDRESS && chainId === 8453;
export const SEKI_SWAP_TOKEN_ADDRESS = hasMainnetSeki ? SEKI_TOKEN_ADDRESS : PLACEHOLDER_SWAP_TOKEN;
export const SEKI_SWAP_NETWORK = hasMainnetSeki ? MINT_CLUB_NETWORK : PLACEHOLDER_SWAP_NETWORK;

export const SWAP_TOKENS = [
  {
    key: "dojo",
    label: "$DOJO",
    address: SWAP_TOKEN_ADDRESS,
    network: SWAP_NETWORK,
    reserveLabel: DOJO_TOKEN_ADDRESS ? "$SEKI" : "ETH",
    priceKey: "swap.priceDojo",
    buyKey: "swap.buyDojo",
    sellKey: "swap.sellDojo",
  },
  {
    key: "seki",
    label: "$SEKI",
    address: SEKI_SWAP_TOKEN_ADDRESS,
    network: SEKI_SWAP_NETWORK,
    reserveLabel: "$HUNT",
    priceKey: "swap.priceSeki",
    buyKey: "swap.buySeki",
    sellKey: "swap.sellSeki",
  },
];

// DojoFaucet contract (loaded from env — set after deployment)
export const DOJO_FAUCET_ADDRESS =
  getEnv("VITE_DOJO_FAUCET_ADDRESS", "");
