import { useWriteContract, useReadContract } from "wagmi";
import { useWalletAddress, MINT_CLUB, merkleDistributorAbi } from "@sekigahara/engine";

/**
 * Hook for claiming a Merkle distribution reward.
 *
 * @param {{ distributionId: bigint|null, proof: string[] }} params
 * @returns {{ claim: Function|null, isClaimed: boolean, isClaimedLoading: boolean, isPending: boolean }}
 */
export function useClaim({ distributionId, proof }) {
  const { address } = useWalletAddress();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: isClaimed, isLoading: isClaimedLoading } = useReadContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "isClaimed",
    args: [distributionId, address],
    query: { enabled: distributionId != null && !!address, staleTime: 60_000 },
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
