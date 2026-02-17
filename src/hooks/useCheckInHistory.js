import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbiItem } from "viem";
import { activeChain } from "@/config/chains.js";
import { EAS_ADDRESS, DOJO_SCHEMA_UID } from "@/config/contracts.js";
import { DEPLOY_BLOCK } from "@/config/constants.js";

const client = createPublicClient({
  chain: activeChain,
  transport: http(),
});

const attestedEvent = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
);

// Base mainnet public RPC limits eth_getLogs to ~3k blocks per request
const MAX_BLOCK_RANGE = 2_000n;

/**
 * Fetches logs in chunks to stay within RPC block range limits.
 */
async function getLogsPaginated({ address, event, args, fromBlock, toBlock }) {
  const latest = toBlock === "latest"
    ? await client.getBlockNumber()
    : toBlock;

  const allLogs = [];
  let cursor = fromBlock;

  while (cursor <= latest) {
    const end = cursor + MAX_BLOCK_RANGE - 1n > latest
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
 * Queries EAS Attested event logs for a user's DOJO check-in history.
 * Paginates in 10k-block chunks to respect public RPC limits.
 * Returns sorted list of { uid, blockNumber, timestamp } objects.
 */
export function useCheckInHistory(address) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkInHistory", address],
    queryFn: async () => {
      if (!address || !DOJO_SCHEMA_UID) return [];

      const logs = await getLogsPaginated({
        address: EAS_ADDRESS,
        event: attestedEvent,
        args: {
          attester: address,
          schemaUID: DOJO_SCHEMA_UID,
        },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });

      // Fetch block timestamps for accurate dates
      const blockNumbers = [...new Set(logs.map((l) => l.blockNumber))];
      const blocks = await Promise.all(
        blockNumbers.map((n) => client.getBlock({ blockNumber: n })),
      );
      const timestampByBlock = Object.fromEntries(
        blocks.map((b) => [b.number.toString(), Number(b.timestamp)]),
      );

      return logs.map((log) => ({
        uid: log.data,
        blockNumber: Number(log.blockNumber),
        timestamp: timestampByBlock[log.blockNumber.toString()] ?? 0,
      }));
    },
    enabled: !!address,
    staleTime: 30_000,
  });

  const checkIns = data ?? [];

  return {
    checkIns,
    totalCheckIns: checkIns.length,
    isLoading,
    isError,
  };
}
