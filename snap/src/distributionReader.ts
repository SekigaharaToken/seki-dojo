import {
  createPublicClient,
  http,
  fallback,
  parseAbiItem,
  decodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { base } from "viem/chains";
import type { WeekDistribution, TierEntry } from "./types.js";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
const DEPLOY_BLOCK = 42_263_066n;
const MAX_BLOCK_RANGE = 2_000n;

const DISTRIBUTION_SCHEMA_UID = (
  process.env.DISTRIBUTION_SCHEMA_UID ?? ""
).toLowerCase() as `0x${string}`;

const MERKLE_DISTRIBUTOR = (
  process.env.MERKLE_DISTRIBUTOR ?? "0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4"
).toLowerCase() as `0x${string}`;

const transport = fallback([
  http("https://mainnet.base.org"),
  http("https://base-rpc.publicnode.com"),
  http("https://base.drpc.org"),
]);

const client = createPublicClient({
  chain: base,
  transport,
});

const attestedEvent = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
);

const distSchemaParams = parseAbiParameters(
  "string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID",
);

const easGetAttestationAbi = [
  {
    name: "getAttestation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
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
      },
    ],
  },
] as const;

const isClaimedAbi = [
  {
    name: "isClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "distributionId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function getLogsPaginated(fromBlock: bigint): Promise<any[]> {
  const latest = await client.getBlockNumber();
  const allLogs: any[] = [];
  let cursor = fromBlock;

  while (cursor <= latest) {
    const end =
      cursor + MAX_BLOCK_RANGE - 1n > latest
        ? latest
        : cursor + MAX_BLOCK_RANGE - 1n;

    const logs = await client.getLogs({
      address: EAS_ADDRESS,
      event: attestedEvent,
      args: { schemaUID: DISTRIBUTION_SCHEMA_UID },
      fromBlock: cursor,
      toBlock: end,
    });

    allLogs.push(...logs);
    cursor = end + 1n;
  }

  return allLogs;
}

/**
 * Read the latest week's distribution from EAS attestations on Base.
 * Returns null if no attestations are found.
 */
export async function getLatestDistribution(): Promise<WeekDistribution | null> {
  if (!DISTRIBUTION_SCHEMA_UID) return null;

  const logs = await getLogsPaginated(DEPLOY_BLOCK);
  if (logs.length === 0) return null;

  const entries: TierEntry[] = await Promise.all(
    logs.map(async (log: any) => {
      const uid = log.args.uid;
      const attestation = await client.readContract({
        address: EAS_ADDRESS,
        abi: easGetAttestationAbi,
        functionName: "getAttestation",
        args: [uid],
      });

      const [app, week, tier, distributionId, reward, ipfsCID] =
        decodeAbiParameters(distSchemaParams, (attestation as any).data);

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

  // Group by week, take the latest
  const byWeek = new Map<number, TierEntry[]>();
  for (const entry of entries) {
    if (!byWeek.has(entry.week)) byWeek.set(entry.week, []);
    byWeek.get(entry.week)!.push(entry);
  }

  const latestWeek = Math.max(...byWeek.keys());
  const tiers = byWeek.get(latestWeek)!.sort((a, b) => a.tier - b.tier);

  return { week: latestWeek, tiers };
}

/**
 * Check if a given address has already claimed a distribution.
 */
export async function checkIsClaimed(
  distributionId: number,
  address: string,
): Promise<boolean> {
  return (await client.readContract({
    address: MERKLE_DISTRIBUTOR,
    abi: isClaimedAbi,
    functionName: "isClaimed",
    args: [BigInt(distributionId), address as `0x${string}`],
  })) as boolean;
}
