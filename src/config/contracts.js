/**
 * Contract addresses — chain-aware via VITE_CHAIN_ID.
 * EAS predeploys are identical on all OP Stack chains.
 */

import { getEnv } from "./env.js";

const chainId = Number(getEnv("VITE_CHAIN_ID", "8453"));

// EAS (OP Stack Predeploys — same on Base Mainnet and Base Sepolia)
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
export const SCHEMA_REGISTRY_ADDRESS =
  "0x4200000000000000000000000000000000000020";

// Mint Club V2
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
  BOND: "0x5dfA75b0185efBaEF286E80B847ce84ff8a62C2d",
  ERC20: "0x37F540de37afE8bDf6C722d87CB019F30e5E406a",
  ERC1155: "0x4bF67e5C9baD43DD89dbe8fCAD3c213C868fe881",
  ZAP: "0x40c7DC399e01029a51cAb316f8Bca7D20DE31bad",
  LOCKER: "0x2c6B3fe4D6de27363cFEC95f703889EaF6b770fB",
  MERKLE: "0xCbb23973235feA43E62C41a0c67717a92a2467f2",
  STAKE: "",
};

export const MINT_CLUB =
  chainId === 84532 ? MINT_CLUB_SEPOLIA : MINT_CLUB_MAINNET;

// Custom contracts (loaded from env — set after deployment)
export const DOJO_RESOLVER_ADDRESS =
  getEnv("VITE_DOJO_RESOLVER_ADDRESS", "");
export const DOJO_SCHEMA_UID = getEnv("VITE_DOJO_SCHEMA_UID", "");

// Project tokens (loaded from env — set after Mint Club creation)
export const SEKI_TOKEN_ADDRESS =
  getEnv("VITE_SEKI_TOKEN_ADDRESS", "");
export const DOJO_TOKEN_ADDRESS =
  getEnv("VITE_DOJO_TOKEN_ADDRESS", "");
