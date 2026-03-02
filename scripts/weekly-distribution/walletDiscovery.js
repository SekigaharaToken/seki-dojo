import { createPublicClient, http, fallback, parseAbiItem } from "viem";
import { activeChain } from "../../src/config/chains.js";
import {
  EAS_ADDRESS,
  DOJO_SCHEMA_UID,
  DOJO_RESOLVER_ADDRESS,
} from "../../src/config/contracts.js";
import { dojoResolverAbi } from "../../src/config/abis/dojoResolver.js";
import { STREAK_TIERS, SECONDS_PER_DAY, DEPLOY_BLOCK } from "../../src/config/constants.js";

const SEVEN_DAYS = 7 * SECONDS_PER_DAY;

// Our getLogs queries filter by indexed schemaUID topic, so result sets are
// small even across large block ranges. 50k blocks is safe for filtered queries
// on Base public RPCs (the 3k limit applies to unfiltered/broad queries).
const MAX_BLOCK_RANGE = 50_000n;

// Multiple free Base RPCs — fallback in order if one is down.
const client = createPublicClient({
  chain: activeChain,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

/**
 * Fetch logs in paginated chunks to stay within RPC block range limits.
 */
async function getLogsPaginated({ address, event, args, fromBlock, toBlock }) {
  const latest =
    toBlock === "latest" ? await client.getBlockNumber() : toBlock;

  const allLogs = [];
  let cursor = fromBlock;

  while (cursor <= latest) {
    const end =
      cursor + MAX_BLOCK_RANGE - 1n > latest
        ? latest
        : cursor + MAX_BLOCK_RANGE - 1n;

    const logs = await client.getLogs({
      address,
      event,
      args,
      fromBlock: cursor,
      toBlock: end,
    });

    allLogs.push(...logs);
    cursor = end + 1n;
  }

  return allLogs;
}

/**
 * Discover all active DOJO wallets from EAS attestation logs.
 * Reads currentStreak + lastCheckIn from DojoResolver.
 * Filters to wallets active within the last 7 days (unless skipCutoff is true).
 *
 * @param {{ skipCutoff?: boolean }} options
 * @returns {Promise<Array<{ address: string, currentStreak: number, lastCheckIn: number }>>}
 */
export async function discoverWallets({ skipCutoff = false } = {}) {
  const logs = await getLogsPaginated({
    address: EAS_ADDRESS,
    event: parseAbiItem(
      "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
    ),
    args: { schemaUID: DOJO_SCHEMA_UID },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });

  const uniqueAddresses = [...new Set(logs.map((l) => l.args.attester))];

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
  if (skipCutoff) return wallets.filter((w) => w.currentStreak > 0);
  return wallets.filter((w) => w.lastCheckIn >= cutoff);
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
