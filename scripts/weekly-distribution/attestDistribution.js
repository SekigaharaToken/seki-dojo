/**
 * EAS Attestation for Distribution Metadata
 *
 * Creates one EAS attestation per tier per week, recording distribution
 * metadata onchain. Schema:
 *   string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID
 *
 * Attester + Recipient = CDP Server Wallet (dojo-operator).
 * Resolver: address(0) — no validation logic needed for data records.
 * Revocable: false.
 */

import { encodeAbiParameters, parseAbiParameters, zeroHash } from "viem";
import { EAS_ADDRESS, DOJO_DISTRIBUTION_SCHEMA_UID } from "../../src/config/contracts.js";

const easAttestAbi = [
  {
    name: "attest",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "schema", type: "bytes32" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "recipient", type: "address" },
              { name: "expirationTime", type: "uint64" },
              { name: "revocable", type: "bool" },
              { name: "refUID", type: "bytes32" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
];

/**
 * Encode distribution data for the EAS schema.
 *
 * @param {{ app: string, week: number, tier: number, distributionId: number, reward: number, ipfsCID: string }} params
 * @returns {`0x${string}`}
 */
export function encodeDistributionData({ app, week, tier, distributionId, reward, ipfsCID }) {
  return encodeAbiParameters(
    parseAbiParameters("string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID"),
    [app, week, tier, BigInt(distributionId), reward, ipfsCID],
  );
}

/**
 * Create an EAS attestation for a single distribution tier.
 *
 * @param {{ walletClient: object, publicClient: object, week: number, tier: object, distributionId: number, ipfsCID: string }} params
 * @returns {Promise<{ hash: string, uid: string }>}
 */
export async function attestDistributionTier({
  walletClient,
  publicClient,
  week,
  tier,
  distributionId,
  ipfsCID,
}) {
  if (!DOJO_DISTRIBUTION_SCHEMA_UID) {
    throw new Error("VITE_DOJO_DISTRIBUTION_SCHEMA_UID not configured");
  }

  const data = encodeDistributionData({
    app: "dojo",
    week,
    tier: tier.id,
    distributionId,
    reward: tier.reward,
    ipfsCID,
  });

  const operatorAddress = walletClient.account.address;

  const hash = await walletClient.writeContract({
    address: EAS_ADDRESS,
    abi: easAttestAbi,
    functionName: "attest",
    args: [
      {
        schema: DOJO_DISTRIBUTION_SCHEMA_UID,
        data: {
          recipient: operatorAddress,
          expirationTime: 0n,
          revocable: false,
          refUID: zeroHash,
          data,
          value: 0n,
        },
      },
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract UID from Attested event
  const attestedLog = receipt.logs.find(
    (log) => log.topics[0] === "0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75c5230a93e",
  );
  const uid = attestedLog ? attestedLog.data.slice(0, 66) : null;

  return { hash, uid };
}

/**
 * Attest all distribution tiers for a given week.
 *
 * @param {{ walletClient: object, publicClient: object, weekNumber: number, tierData: object[] }} params
 */
export async function attestDistributions({ walletClient, publicClient, weekNumber, tierData }) {
  for (const td of tierData) {
    const { tier, distributionId, ipfsCID } = td;

    if (!distributionId || !ipfsCID) {
      console.warn(`   Skipping attestation for Tier ${tier.id} — missing distributionId or ipfsCID`);
      continue;
    }

    const { hash, uid } = await attestDistributionTier({
      walletClient,
      publicClient,
      week: weekNumber,
      tier,
      distributionId,
      ipfsCID,
    });

    console.log(`   Tier ${tier.id} attested: TX ${hash}`);
    if (uid) console.log(`   Attestation UID: ${uid}`);
  }
}
