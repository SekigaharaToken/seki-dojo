import { keccak256, toHex } from "viem";
import MerkleTree from "merkletreejs";
import { getLatestDistribution, checkIsClaimed } from "./distributionReader.js";
import type { EligibilityResult } from "./types.js";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Resolve a Farcaster FID to verified Ethereum addresses via Neynar API.
 */
async function resolveAddresses(fid: number): Promise<string[]> {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    { headers: { "x-api-key": NEYNAR_API_KEY } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  const user = data.users?.[0];
  if (!user) return [];

  return (user.verified_addresses?.eth_addresses ?? []).map((a: string) =>
    a.toLowerCase(),
  );
}

/**
 * Fetch the address whitelist from IPFS for a given CID.
 */
async function fetchAddressList(ipfsCID: string): Promise<string[] | null> {
  if (!ipfsCID) return null;
  const res = await fetch(`${IPFS_GATEWAY}/${ipfsCID}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Hash function matching the main app's merkle.js — keccak256 for both
 * hex strings and Buffer/Uint8Array (merkletreejs intermediate nodes).
 */
function hashFn(data: string | Buffer | Uint8Array): string {
  if (typeof data === "string") return keccak256(data as `0x${string}`);
  return keccak256(toHex(data));
}

/**
 * Build a merkle tree from an address list and compute the proof for a target address.
 */
function computeMerkleProof(
  addresses: string[],
  targetAddress: string,
): string[] {
  const leaves = addresses.map((addr) => hashFn(addr));
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
  const leaf = hashFn(targetAddress);
  return tree.getHexProof(leaf);
}

/**
 * Check if a Farcaster user (by FID) is eligible for the current week's distribution.
 * Returns eligibility details including merkle proof for claiming.
 */
export async function checkEligibility(
  fid: number,
): Promise<EligibilityResult | null> {
  // 1. Get latest distribution from EAS
  const distribution = await getLatestDistribution();
  if (!distribution) return null;

  // 2. Resolve FID to wallet addresses
  const userAddresses = await resolveAddresses(fid);
  if (userAddresses.length === 0) return null;

  // 3. Check each tier for a matching address
  for (const tier of distribution.tiers) {
    const whitelist = await fetchAddressList(tier.ipfsCID);
    if (!whitelist) continue;

    const lowerWhitelist = whitelist.map((a) => a.toLowerCase());

    for (const addr of userAddresses) {
      const idx = lowerWhitelist.indexOf(addr);
      if (idx === -1) continue;

      // Found a match — compute proof and check claimed status
      const proof = computeMerkleProof(lowerWhitelist, addr);
      const alreadyClaimed = await checkIsClaimed(
        tier.distributionId,
        addr,
      );

      return {
        eligible: true,
        alreadyClaimed,
        address: addr,
        distributionId: tier.distributionId,
        reward: tier.reward,
        week: distribution.week,
        tierId: tier.tier,
        proof,
      };
    }
  }

  return null;
}
