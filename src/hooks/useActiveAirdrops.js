import { useQuery } from "@tanstack/react-query";
import { useWalletAddress } from "@sekigahara/engine";
import { buildMerkleTree, getMerkleProof } from "@/lib/merkle.js";
import { useDistributionAttestations } from "./useDistributionAttestations.js";

const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Fetch the address list from IPFS for a distribution tier.
 * Returns null if CID is empty or fetch fails.
 */
async function fetchAddressList(ipfsCID) {
  if (!ipfsCID) return null;
  const res = await fetch(`${IPFS_GATEWAY}/${ipfsCID}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Find the connected wallet in the most recent week's distribution attestations.
 * Reads distribution metadata from EAS, fetches address lists from IPFS,
 * and computes Merkle proofs client-side.
 *
 * Falls back to distributions.json if no EAS attestations are available.
 */
export function useActiveAirdrops() {
  const { address } = useWalletAddress();
  const lowerAddress = address?.toLowerCase();
  const { distributions, isLoading: attestationsLoading } = useDistributionAttestations();

  const { data, isLoading: matchLoading } = useQuery({
    queryKey: ["activeAirdrop", lowerAddress, distributions],
    queryFn: async () => {
      // If EAS attestations are available, use them
      if (distributions.length > 0) {
        const latest = distributions[0]; // newest week first

        for (const tierEntry of latest.tiers) {
          const addresses = await fetchAddressList(tierEntry.ipfsCID);
          if (!addresses) continue;

          const idx = addresses.findIndex(
            (a) => a.toLowerCase() === lowerAddress,
          );
          if (idx !== -1) {
            const result = buildMerkleTree(addresses);
            const proof = result ? getMerkleProof(result.tree, lowerAddress) : [];

            return {
              distributionId: tierEntry.distributionId,
              reward: tierEntry.reward,
              tierId: tierEntry.tier,
              airdropUrl: `${AIRDROP_BASE_URL}/${tierEntry.distributionId}`,
              proof,
            };
          }
        }

        return null;
      }

      // Fallback: read from distributions.json
      const res = await fetch("/data/distributions.json");
      if (!res.ok) return null;
      const jsonData = await res.json();
      if (!Array.isArray(jsonData) || jsonData.length === 0) return null;

      const latest = jsonData[0];
      for (const tierEntry of latest.tiers) {
        const idx = tierEntry.addresses.findIndex(
          (a) => a.toLowerCase() === lowerAddress,
        );
        if (idx !== -1) {
          const result = buildMerkleTree(tierEntry.addresses);
          const proof = result ? getMerkleProof(result.tree, lowerAddress) : [];

          return {
            distributionId: tierEntry.distributionId,
            reward: tierEntry.reward,
            tierId: tierEntry.tier,
            airdropUrl: `${AIRDROP_BASE_URL}/${tierEntry.distributionId}`,
            proof,
          };
        }
      }

      return null;
    },
    enabled: !!lowerAddress && !attestationsLoading,
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = attestationsLoading || matchLoading;

  if (!data) {
    return { distributionId: null, reward: null, tierId: null, airdropUrl: null, proof: [], isLoading };
  }

  return { ...data, isLoading };
}
