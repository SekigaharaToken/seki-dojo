import { useQuery } from "@tanstack/react-query";
import { useWalletAddress } from "@sekigahara/engine";
import { buildMerkleTree, getMerkleProof } from "@/lib/merkle.js";

const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";

/**
 * Fetch distributions.json and find the connected wallet in the most recent week.
 * Returns distributionId, reward, tier info, airdrop URL, and Merkle proof.
 */
export function useActiveAirdrops() {
  const { address } = useWalletAddress();
  const lowerAddress = address?.toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ["distributions", lowerAddress],
    queryFn: async () => {
      const res = await fetch("/data/distributions.json");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || !Array.isArray(data) || data.length === 0 || !lowerAddress) {
    return { distributionId: null, reward: null, tierId: null, airdropUrl: null, proof: [], isLoading };
  }

  // Scan only the most recent week (index 0)
  const latest = data[0];

  for (const tierEntry of latest.tiers) {
    const idx = tierEntry.addresses.findIndex(
      (a) => a.toLowerCase() === lowerAddress,
    );
    if (idx !== -1) {
      // Build tree and compute proof
      const result = buildMerkleTree(tierEntry.addresses);
      const proof = result ? getMerkleProof(result.tree, lowerAddress) : [];

      return {
        distributionId: tierEntry.distributionId,
        reward: tierEntry.reward,
        tierId: tierEntry.tier,
        airdropUrl: `${AIRDROP_BASE_URL}/${tierEntry.distributionId}`,
        proof,
        isLoading,
      };
    }
  }

  return { distributionId: null, reward: null, tierId: null, airdropUrl: null, proof: [], isLoading };
}
