#!/usr/bin/env node

/**
 * Weekly DOJO Reward Distribution Script
 *
 * Usage:
 *   node scripts/weekly-distribution/index.js
 *   node scripts/weekly-distribution/index.js --week 3
 *   node scripts/weekly-distribution/index.js --week 1 --partial
 *   node scripts/weekly-distribution/index.js --dry-run
 *
 * Flags:
 *   --week <n>    Week number (default: from WEEK_NUMBER env or "1")
 *   --partial     Partial week — skips the 7-day activity window filter,
 *                 so wallets with any streak (even 1 day) get rewarded.
 *                 Use this for the first distribution after a mid-week launch.
 *   --dry-run     Show what would happen without sending transactions or pinning.
 *
 * Orchestrates the full weekly distribution flow:
 * 1. Discover active wallets from EAS attestation logs
 * 2. Bucket wallets into tiers by streak
 * 3. Build Merkle trees for each tier
 * 4. Pin trees to IPFS via Pinata
 * 5. Create distributions on MerkleDistributor contract
 *
 * Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET,
 *           VITE_PINATA_JWT, VITE_DOJO_TOKEN_ADDRESS,
 *           VITE_DOJO_RESOLVER_ADDRESS, VITE_DOJO_SCHEMA_UID in env or .env
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

// --- Parse CLI args ---
const args = process.argv.slice(2);

function getFlag(name) {
  return args.includes(`--${name}`);
}

function getOption(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
}

const WEEK_NUMBER = parseInt(
  getOption("week", process.env.WEEK_NUMBER || "1"),
  10,
);
const PARTIAL_WEEK = getFlag("partial");
const DRY_RUN = getFlag("dry-run");

async function main() {
  const mode = PARTIAL_WEEK ? "PARTIAL" : "FULL";
  const dryTag = DRY_RUN ? " [DRY RUN]" : "";

  console.log(
    `\n=== DOJO Weekly Distribution — Week ${WEEK_NUMBER} (${mode})${dryTag} ===\n`,
  );

  if (PARTIAL_WEEK) {
    console.log(
      "  Partial week mode: all wallets with any streak will be included,",
    );
    console.log("  regardless of when they last checked in.\n");
  }

  if (DRY_RUN) {
    console.log("  Dry run: no transactions will be sent, no IPFS pins.\n");
  }

  // Step 1: Discover wallets
  console.log("1. Discovering active wallets...");
  const wallets = await discoverWallets({ skipCutoff: PARTIAL_WEEK, verbose: DRY_RUN });
  const windowLabel = PARTIAL_WEEK
    ? "all with active streak"
    : "within 7-day window";
  console.log(`   Found ${wallets.length} wallets (${windowLabel})`);

  if (wallets.length === 0) {
    console.log("\n   No active wallets found. Nothing to distribute.");
    return;
  }

  // Step 2: Bucket by tier
  console.log("\n2. Bucketing by streak tier...");
  const buckets = bucketByTier(wallets);

  let totalWallets = 0;
  for (const tier of STREAK_TIERS) {
    const count = buckets[tier.id].length;
    totalWallets += count;
    if (count > 0) {
      console.log(
        `   Tier ${tier.id} (${tier.nameKey.split(".")[1]}, streak ${tier.min}-${tier.max === Infinity ? "∞" : tier.max}): ${count} wallets × ${tier.reward} $DOJO`,
      );
    }
  }

  if (totalWallets === 0) {
    console.log("   No wallets qualified for any tier. Exiting.");
    return;
  }

  // Steps 3-5: Build trees, pin, create distributions
  let totalApprovalNeeded = 0n;
  const tierData = [];

  for (const tier of STREAK_TIERS) {
    const tierWallets = buckets[tier.id];
    if (tierWallets.length === 0) continue;

    const addresses = tierWallets.map((w) => w.address);
    const amountPerClaim = parseUnits(String(tier.reward), 18);
    const totalForTier = amountPerClaim * BigInt(tierWallets.length);
    totalApprovalNeeded += totalForTier;

    const { root, tree } = buildMerkleTree(addresses);

    tierData.push({
      tier,
      root,
      addresses,
      amountPerClaim,
      walletCount: tierWallets.length,
      totalForTier,
    });
  }

  console.log(
    `\n   Total $DOJO needed: ${totalApprovalNeeded / 10n ** 18n} (${tierData.length} tier(s))`,
  );

  if (DRY_RUN) {
    console.log(
      "\n=== DRY RUN — would create the following distributions ===\n",
    );
    for (const { tier, walletCount, amountPerClaim, totalForTier } of tierData) {
      console.log(
        `   Tier ${tier.id}: ${walletCount} wallets × ${amountPerClaim / 10n ** 18n} = ${totalForTier / 10n ** 18n} $DOJO`,
      );
    }

    // Show cast preview (resolves FIDs but doesn't post)
    try {
      await notifyDistributions({
        tierResults: tierData,
        weekNumber: WEEK_NUMBER,
        dryRun: true,
      });
    } catch (err) {
      console.warn("Cast preview failed:", err.message);
    }

    console.log("\n=== No transactions sent ===\n");
    return;
  }

  // Step 3: Approve token spending
  console.log(
    `\n3. Approving ${totalApprovalNeeded / 10n ** 18n} $DOJO for MerkleDistributor...`,
  );
  await approveToken({
    tokenAddress: DOJO_TOKEN_ADDRESS,
    spender: MINT_CLUB.MERKLE,
    amount: totalApprovalNeeded,
  });
  console.log("   Approved.");

  // Steps 4-5: Pin + create distribution per tier
  for (const td of tierData) {
    const { tier, root, addresses, amountPerClaim, walletCount } = td;
    const suffix = PARTIAL_WEEK ? " (partial)" : "";
    const name = `dojo-week-${WEEK_NUMBER}-tier-${tier.id}.json`;

    console.log(`\n4. Pinning Tier ${tier.id} whitelist to IPFS...`);
    const cid = await pinToIpfs(addresses, name);
    console.log(`   CID: ${cid}`);

    console.log(`5. Creating distribution for Tier ${tier.id}${suffix}...`);
    const { hash: txHash, distributionId } = await createDistribution({
      tokenAddress: DOJO_TOKEN_ADDRESS,
      amountPerClaim,
      walletCount,
      merkleRoot: root,
      title: `DOJO Week ${WEEK_NUMBER} - Tier ${tier.id}${suffix}`,
      ipfsCID: cid,
    });
    console.log(`   TX: ${txHash}`);
    console.log(`   Distribution ID: ${distributionId}`);

    // Attach distributionId for cast notifications
    td.distributionId = distributionId;
  }

  // Step 6-7: Post Farcaster cast notifications (non-fatal)
  try {
    await notifyDistributions({ tierResults: tierData, weekNumber: WEEK_NUMBER });
  } catch (err) {
    console.warn("Cast notification failed (non-fatal):", err.message);
  }

  console.log(`\n=== Distribution complete (Week ${WEEK_NUMBER}, ${mode}) ===\n`);
}

main().catch((err) => {
  console.error("Distribution failed:", err);
  process.exit(1);
});
