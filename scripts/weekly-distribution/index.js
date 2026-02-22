/**
 * Weekly DOJO Reward Distribution Script
 *
 * Orchestrates the full weekly distribution flow:
 * 1. Discover active wallets from EAS attestation logs
 * 2. Bucket wallets into tiers by streak
 * 3. Build Merkle trees for each tier
 * 4. Pin trees to IPFS via Pinata
 * 5. Create distributions on MerkleDistributor contract
 *
 * Run: node --experimental-modules scripts/weekly-distribution/index.js
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET,
 *           VITE_PINATA_JWT, VITE_DOJO_TOKEN_ADDRESS env vars
 */

import "dotenv/config";
import { parseUnits } from "viem";
import { discoverWallets, bucketByTier } from "./walletDiscovery.js";
import { buildMerkleTree } from "./merkleBuilder.js";
import { pinToIpfs } from "./ipfsPin.js";
import { approveToken, createDistribution } from "./createDistributions.js";
import { notifyDistributions } from "./castNotifier.js";
import { STREAK_TIERS } from "../../src/config/constants.js";
import { DOJO_TOKEN_ADDRESS, MINT_CLUB } from "../../src/config/contracts.js";

const WEEK_NUMBER = parseInt(process.env.WEEK_NUMBER || "1", 10);

async function main() {
  console.log(`\n=== DOJO Weekly Distribution — Week ${WEEK_NUMBER} ===\n`);

  // Step 1: Discover wallets
  console.log("1. Discovering active wallets...");
  const wallets = await discoverWallets();
  console.log(`   Found ${wallets.length} active wallets`);

  if (wallets.length === 0) {
    console.log("   No active wallets. Exiting.");
    return;
  }

  // Step 2: Bucket by tier
  console.log("2. Bucketing by tier...");
  const buckets = bucketByTier(wallets);
  for (const tier of STREAK_TIERS) {
    console.log(`   Tier ${tier.id}: ${buckets[tier.id].length} wallets`);
  }

  // Step 3-5: For each non-empty tier, build tree, pin, create distribution
  let totalApprovalNeeded = 0n;

  const tierData = [];
  for (const tier of STREAK_TIERS) {
    const tierWallets = buckets[tier.id];
    if (tierWallets.length === 0) continue;

    const addresses = tierWallets.map((w) => w.address);
    const amountPerClaim = parseUnits(String(tier.reward), 18);
    const totalForTier = amountPerClaim * BigInt(tierWallets.length);
    totalApprovalNeeded += totalForTier;

    // Build Merkle tree
    const { root, tree } = buildMerkleTree(addresses);

    tierData.push({ tier, root, addresses, amountPerClaim, walletCount: tierWallets.length });
  }

  if (tierData.length === 0) {
    console.log("   No wallets in any tier. Exiting.");
    return;
  }

  // Step 3: Approve total token spending
  console.log(`3. Approving ${totalApprovalNeeded} $DOJO for MerkleDistributor...`);
  await approveToken({
    tokenAddress: DOJO_TOKEN_ADDRESS,
    spender: MINT_CLUB.MERKLE,
    amount: totalApprovalNeeded,
  });
  console.log("   Approved.");

  // Step 4-5: Pin + create distribution per tier
  for (const { tier, root, addresses, amountPerClaim, walletCount } of tierData) {
    const name = `dojo-week-${WEEK_NUMBER}-tier-${tier.id}.json`;

    console.log(`4. Pinning Tier ${tier.id} whitelist to IPFS...`);
    const cid = await pinToIpfs(addresses, name);
    console.log(`   CID: ${cid}`);

    console.log(`5. Creating distribution for Tier ${tier.id}...`);
    const txHash = await createDistribution({
      tokenAddress: DOJO_TOKEN_ADDRESS,
      amountPerClaim,
      walletCount,
      merkleRoot: root,
      title: `DOJO Week ${WEEK_NUMBER} - Tier ${tier.id}`,
      ipfsCID: cid,
    });
    console.log(`   TX: ${txHash}`);
  }

  // Step 6-7: Post Farcaster cast notifications (non-fatal)
  try {
    await notifyDistributions({ tierResults: tierData, weekNumber: WEEK_NUMBER });
  } catch (err) {
    console.warn("Cast notification failed (non-fatal):", err.message);
  }

  console.log("\n=== Distribution complete ===\n");
}

main().catch((err) => {
  console.error("Distribution failed:", err);
  process.exit(1);
});
