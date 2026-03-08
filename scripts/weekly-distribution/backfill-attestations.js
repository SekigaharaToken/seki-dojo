#!/usr/bin/env node

/**
 * One-off Backfill: Attest Historical Distributions to EAS
 *
 * Reads existing distributions.json and creates EAS attestations for
 * each tier in each week. Makes the onchain record complete so the
 * frontend can migrate away from the JSON file.
 *
 * Usage:
 *   node scripts/weekly-distribution/backfill-attestations.js --dry-run
 *   node scripts/weekly-distribution/backfill-attestations.js
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicClient, getWalletClient } from "./createDistributions.js";
import { attestDistributionTier } from "./attestDistribution.js";
import { DOJO_DISTRIBUTION_SCHEMA_UID } from "../../src/config/contracts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const JSON_PATH = resolve(REPO_ROOT, "public/data/distributions.json");

const DRY_RUN = process.argv.includes("--dry-run");

// Tier reward lookup (matches STREAK_TIERS in constants.js)
const TIER_REWARDS = { 1: 100, 2: 150, 3: 180, 4: 200 };

async function main() {
  if (!DOJO_DISTRIBUTION_SCHEMA_UID) {
    console.error("VITE_DOJO_DISTRIBUTION_SCHEMA_UID not set. Register the schema first.");
    process.exit(1);
  }

  const raw = await readFile(JSON_PATH, "utf-8");
  const distributions = JSON.parse(raw);

  console.log(`\nFound ${distributions.length} week(s) in distributions.json`);

  if (DRY_RUN) {
    console.log("[DRY RUN] Would attest the following:\n");
    for (const week of distributions) {
      for (const t of week.tiers) {
        console.log(
          `  Week ${week.week}, Tier ${t.tier}: distributionId=${t.distributionId}, reward=${t.reward}, addresses=${t.addresses.length}`,
        );
      }
    }
    console.log("\nNo transactions sent.");
    return;
  }

  const walletClient = await getWalletClient();
  const publicClient = getPublicClient();

  for (const week of distributions) {
    console.log(`\nAttesting Week ${week.week}...`);

    for (const t of week.tiers) {
      // The JSON may not have an IPFS CID stored — use empty string if missing
      const ipfsCID = t.ipfsCID || "";
      const reward = t.reward || TIER_REWARDS[t.tier] || 0;

      const tier = { id: t.tier, reward };

      console.log(`  Tier ${t.tier} (distributionId: ${t.distributionId})...`);

      const { hash, uid } = await attestDistributionTier({
        walletClient,
        publicClient,
        week: week.week,
        tier,
        distributionId: t.distributionId,
        ipfsCID,
      });

      console.log(`    TX: ${hash}`);
      if (uid) console.log(`    UID: ${uid}`);
    }
  }

  console.log("\nBackfill complete.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
