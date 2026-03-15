import { parseAbiItem } from "viem";
import { activeChain } from "../../src/config/chains.js";
import {
  EAS_ADDRESS,
  DOJO_SCHEMA_UID,
  DOJO_RESOLVER_ADDRESS,
} from "../../src/config/contracts.js";
import { dojoResolverAbi } from "../../src/config/abis/dojoResolver.js";
import { STREAK_TIERS, SECONDS_PER_DAY, DEPLOY_BLOCK } from "../../src/config/constants.js";
import { client, getLogsPaginated } from "./rpcClient.js";

const SEVEN_DAYS = 7 * SECONDS_PER_DAY;

// Only scan the last ~14 days of blocks for attestation discovery.
// Wallets must have checked in within 7 days to qualify, so 14 days
// provides a safe buffer. Base produces ~1 block/2s = 43,200 blocks/day.
const SCAN_WINDOW_BLOCKS = 14n * 43_200n; // ~604,800 blocks

/**
 * Discover all active DOJO wallets from EAS attestation logs.
 * Reads currentStreak + lastCheckIn from DojoResolver.
 * Filters to wallets active within the last 7 days (unless skipCutoff is true).
 *
 * @param {{ skipCutoff?: boolean, verbose?: boolean }} options
 * @returns {Promise<Array<{ address: string, currentStreak: number, lastCheckIn: number }>>}
 */
export async function discoverWallets({ skipCutoff = false, verbose = false } = {}) {
  if (verbose) {
    // Only VITE_* config — never expose CDP_* secrets
    console.log(`   Config: chain=${activeChain.name} (${activeChain.id})`);
    console.log(`   Config: EAS=${EAS_ADDRESS}`);
    console.log(`   Config: schemaUID=${DOJO_SCHEMA_UID}`);
    console.log(`   Config: resolver=${DOJO_RESOLVER_ADDRESS}`);
    console.log(`   Config: DEPLOY_BLOCK=${DEPLOY_BLOCK}`);
  }

  // Compute a recent scan start — no need to scan from DEPLOY_BLOCK every run.
  // Any wallet qualifying for the 7-day filter must have an attestation within 14 days.
  const latestBlock = await client.getBlockNumber();
  const scanFrom = latestBlock > SCAN_WINDOW_BLOCKS
    ? latestBlock - SCAN_WINDOW_BLOCKS
    : DEPLOY_BLOCK;
  const fromBlock = scanFrom > DEPLOY_BLOCK ? scanFrom : DEPLOY_BLOCK;

  if (verbose) {
    console.log(`   Scan window: block ${fromBlock} → ${latestBlock} (~${latestBlock - fromBlock} blocks)`);
  }

  const logs = await getLogsPaginated({
    address: EAS_ADDRESS,
    event: parseAbiItem(
      "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
    ),
    args: { schemaUID: DOJO_SCHEMA_UID },
    fromBlock,
    toBlock: latestBlock,
  });

  console.log(`   Attestation logs found: ${logs.length}`);

  const uniqueAddresses = [...new Set(logs.map((l) => l.args.attester))];
  console.log(`   Unique attester addresses: ${uniqueAddresses.length}`);

  if (uniqueAddresses.length === 0) return [];

  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - SEVEN_DAYS;

  const wallets = await Promise.all(
    uniqueAddresses.map(async (address) => {
      const [currentStreak, lastCheckIn] = await Promise.all([
        client.readContract({
          address: DOJO_RESOLVER_ADDRESS,
          abi: dojoResolverAbi,
          functionName: "currentStreak",
          args: [address],
        }),
        client.readContract({
          address: DOJO_RESOLVER_ADDRESS,
          abi: dojoResolverAbi,
          functionName: "lastCheckIn",
          args: [address],
        }),
      ]);

      return {
        address,
        currentStreak: Number(currentStreak),
        lastCheckIn: Number(lastCheckIn),
      };
    }),
  );

  // Filter to active wallets (checked in within last 7 days)
  if (skipCutoff) {
    const active = wallets.filter((w) => w.currentStreak > 0);
    console.log(`   After streak>0 filter: ${active.length} wallets`);
    return active;
  }

  const active = wallets.filter((w) => w.lastCheckIn >= cutoff);
  console.log(`   After 7-day filter: ${active.length} of ${wallets.length} wallets`);
  return active;
}

/**
 * Bucket wallets into tiers based on current streak.
 *
 * @param {Array<{ address: string, currentStreak: number }>} wallets
 * @returns {{ 1: Array, 2: Array, 3: Array, 4: Array }}
 */
export function bucketByTier(wallets) {
  const buckets = { 1: [], 2: [], 3: [], 4: [] };

  for (const wallet of wallets) {
    if (wallet.currentStreak <= 0) continue;

    const tier = STREAK_TIERS.find(
      (t) => wallet.currentStreak >= t.min && wallet.currentStreak <= t.max,
    );
    if (tier) {
      buckets[tier.id].push(wallet);
    }
  }

  return buckets;
}
