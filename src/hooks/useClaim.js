import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { MINT_CLUB } from "@/config/contracts.js";
import { merkleDistributorAbi } from "@/config/abis/merkleDistributor.js";

/**
 * Hook for claiming a Merkle distribution reward.
 *
 * @param {{ distributionId: bigint|null, proof: string[] }} params
 * @returns {{ claim: Function|null, isClaimed: boolean, isClaimedLoading: boolean, isPending: boolean }}
 */
export function useClaim({ distributionId, proof }) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: isClaimed, isLoading: isClaimedLoading } = useReadContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "isClaimed",
    args: [distributionId, address],
    enabled: distributionId != null && !!address,
  });

  const claim =
    distributionId != null
      ? async () => {
          const hash = await writeContractAsync({
            address: MINT_CLUB.MERKLE,
            abi: merkleDistributorAbi,
            functionName: "claim",
            args: [distributionId, proof],
          });
          return hash;
        }
      : null;

  return {
    claim,
    isClaimed: !!isClaimed,
    isClaimedLoading: !!isClaimedLoading,
    isPending,
  };
}
