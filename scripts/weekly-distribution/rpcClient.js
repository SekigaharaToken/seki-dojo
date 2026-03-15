/**
 * Shared RPC client and parallel log fetcher for distribution scripts.
 *
 * Free-tier RPCs rate-limit GitHub Actions IPs aggressively,
 * so we parallelize getLogs calls with a concurrency cap.
 */

import { createPublicClient, http, fallback } from "viem";
import { activeChain } from "../../src/config/chains.js";

// Base mainnet free RPCs cap getLogs at ~3k blocks.
const MAX_BLOCK_RANGE = 3_000n;

// How many concurrent getLogs calls to issue.
const LOG_CONCURRENCY = 10;

// Multiple free Base RPCs — fallback in order if one is down.
export const client = createPublicClient({
  chain: activeChain,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

/**
 * Run async tasks with a concurrency limit.
 */
async function mapWithConcurrency(items, fn, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fetch logs in parallel paginated chunks to stay within RPC block range limits.
 *
 * Splits the range [fromBlock, toBlock] into MAX_BLOCK_RANGE chunks,
 * then fetches up to LOG_CONCURRENCY chunks at once.
 */
export async function getLogsPaginated({ address, event, args, fromBlock, toBlock }) {
  const latest =
    toBlock === "latest" ? await client.getBlockNumber() : toBlock;

  // Build chunk boundaries
  const chunks = [];
  let cursor = fromBlock;
  while (cursor <= latest) {
    const end = cursor + MAX_BLOCK_RANGE - 1n > latest
      ? latest
      : cursor + MAX_BLOCK_RANGE - 1n;
    chunks.push({ from: cursor, to: end });
    cursor = end + 1n;
  }

  // Fetch chunks in parallel with concurrency limit
  const chunkResults = await mapWithConcurrency(
    chunks,
    async ({ from, to }) => {
      return client.getLogs({ address, event, args, fromBlock: from, toBlock: to });
    },
    LOG_CONCURRENCY,
  );

  return chunkResults.flat();
}
