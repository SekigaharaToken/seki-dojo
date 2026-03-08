#!/usr/bin/env node
/**
 * Manual cast sender for failed tier notifications.
 * Usage: node scripts/weekly-distribution/manual-cast.js
 *
 * Requires env vars: NEYNAR_API_KEY, NEYNAR_SIGNER_UUID, VITE_SEKI_TOKEN_ADDRESS
 */
import "dotenv/config";
import { resolveAddressesToFids, postTierNotification } from "./castNotifier.js";

const TIER_2 = { id: 2, reward: 150, nameKey: "tier.blueBelt" };
const ADDRESSES = ["0x48FFCbCaBb0B10B2A185D398EE67c48080b9D7e7"];
const DISTRIBUTION_ID = 5682;
const WEEK_NUMBER = 1;

async function main() {
  console.log("Resolving Farcaster accounts...");
  const fidMap = await resolveAddressesToFids(ADDRESSES);
  console.log(`Found ${fidMap.size} Farcaster account(s)`);

  console.log("Posting Tier 2 notification...");
  const hashes = await postTierNotification({
    tier: TIER_2,
    reward: TIER_2.reward,
    weekNumber: WEEK_NUMBER,
    fidMap,
    addresses: ADDRESSES,
    distributionId: DISTRIBUTION_ID,
  });

  console.log(`Posted ${hashes.length} cast(s): ${hashes.join(", ")}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
