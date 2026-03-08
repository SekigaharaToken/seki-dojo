import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbiItem, decodeAbiParameters, parseAbiParameters } from "viem";
import { activeChain, EAS_ADDRESS } from "@sekigahara/engine";
import { DOJO_DISTRIBUTION_SCHEMA_UID } from "@/config/contracts.js";
import { DEPLOY_BLOCK } from "@/config/constants.js";

const client = createPublicClient({
  chain: activeChain,
  transport: http(),
});

const attestedEvent = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
);

const distSchemaParams = parseAbiParameters(
  "string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID",
);

const easGetAttestationAbi = [{
  name: "getAttestation",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "uid", type: "bytes32" }],
  outputs: [{
    name: "",
    type: "tuple",
    components: [
      { name: "uid", type: "bytes32" },
      { name: "schema", type: "bytes32" },
      { name: "time", type: "uint64" },
      { name: "expirationTime", type: "uint64" },
      { name: "revocationTime", type: "uint64" },
      { name: "refUID", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "attester", type: "address" },
      { name: "revocable", type: "bool" },
      { name: "data", type: "bytes" },
    ],
  }],
}];

// Base mainnet public RPC limits eth_getLogs to ~3k blocks per request
const MAX_BLOCK_RANGE = 2_000n;

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
 * Queries EAS for distribution attestations and decodes tier metadata.
 * Returns all distributions grouped by week, sorted newest first.
 *
 * Each entry: { week, tier, distributionId, reward, ipfsCID }
 */
export function useDistributionAttestations() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["distributionAttestations"],
    queryFn: async () => {
      if (!DOJO_DISTRIBUTION_SCHEMA_UID) return [];

      const logs = await getLogsPaginated({
        address: EAS_ADDRESS,
        event: attestedEvent,
        args: { schemaUID: DOJO_DISTRIBUTION_SCHEMA_UID },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });

      if (logs.length === 0) return [];

      // Decode each attestation's data
      const entries = await Promise.all(
        logs.map(async (log) => {
          const uid = log.args.uid;
          const attestation = await client.readContract({
            address: EAS_ADDRESS,
            abi: easGetAttestationAbi,
            functionName: "getAttestation",
            args: [uid],
          });

          const [app, week, tier, distributionId, reward, ipfsCID] =
            decodeAbiParameters(distSchemaParams, attestation.data);

          return {
            app,
            week: Number(week),
            tier: Number(tier),
            distributionId: Number(distributionId),
            reward: Number(reward),
            ipfsCID,
          };
        }),
      );

      // Group by week, sorted newest first
      const byWeek = new Map();
      for (const entry of entries) {
        if (!byWeek.has(entry.week)) {
          byWeek.set(entry.week, []);
        }
        byWeek.get(entry.week).push(entry);
      }

      return [...byWeek.entries()]
        .sort(([a], [b]) => b - a)
        .map(([week, tiers]) => ({
          week,
          tiers: tiers.sort((a, b) => a.tier - b.tier),
        }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — distributions change weekly
  });

  return {
    distributions: data ?? [],
    isLoading,
    isError,
  };
}
