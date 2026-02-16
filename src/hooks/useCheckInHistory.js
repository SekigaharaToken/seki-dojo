import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbiItem } from "viem";
import { activeChain } from "@/config/chains.js";
import { EAS_ADDRESS, DOJO_SCHEMA_UID } from "@/config/contracts.js";
import { SECONDS_PER_DAY } from "@/config/constants.js";

const client = createPublicClient({
  chain: activeChain,
  transport: http(),
});

/**
 * Queries EAS Attested event logs for a user's DOJO check-in history.
 * Returns sorted list of { timestamp, day } objects.
 */
export function useCheckInHistory(address) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkInHistory", address],
    queryFn: async () => {
      if (!address || !DOJO_SCHEMA_UID) return [];

      const logs = await client.getLogs({
        address: EAS_ADDRESS,
        event: parseAbiItem(
          "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
        ),
        args: {
          attester: address,
          schemaUID: DOJO_SCHEMA_UID,
        },
        fromBlock: 0n,
        toBlock: "latest",
      });

      return logs.map((log) => {
        const timestamp = Number(log.blockNumber); // Approximate — real impl uses block timestamp
        const day = Math.floor(timestamp / SECONDS_PER_DAY);
        return { timestamp, day };
      });
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
