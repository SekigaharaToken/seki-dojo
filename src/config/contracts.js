/**
 * Contract addresses for Base Mainnet (Chain ID: 8453).
 */

// EAS (OP Stack Predeploys)
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
export const SCHEMA_REGISTRY_ADDRESS =
  "0x4200000000000000000000000000000000000020";

// Mint Club V2
export const MINT_CLUB = {
  BOND: "0xc5a076cad94176c2996B32d8466Be1cE757FAa27",
  ERC20: "0xAa70bC79fD1cB4a6FBA717018351F0C3c64B79Df",
  ERC1155: "0x6c61918eECcC306D35247338FDcf025af0f6120A",
  ZAP: "0x91523b39813F3F4E406ECe406D0bEAaA9dE251fa",
  LOCKER: "0xA3dCf3Ca587D9929d540868c924f208726DC9aB6",
  MERKLE: "0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4",
  STAKE: "0x9Ab05EcA10d087f23a1B22A44A714cdbBA76E802",
};

// Custom contracts (loaded from env — set after deployment)
export const DOJO_RESOLVER_ADDRESS =
  import.meta.env.VITE_DOJO_RESOLVER_ADDRESS || "";
export const DOJO_SCHEMA_UID = import.meta.env.VITE_DOJO_SCHEMA_UID || "";

// Project tokens (loaded from env — set after Mint Club creation)
export const SEKI_TOKEN_ADDRESS =
  import.meta.env.VITE_SEKI_TOKEN_ADDRESS || "";
export const DOJO_TOKEN_ADDRESS =
  import.meta.env.VITE_DOJO_TOKEN_ADDRESS || "";
