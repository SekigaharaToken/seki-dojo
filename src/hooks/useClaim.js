import { useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createPublicClient, http } from "viem";
import {
  useWalletAddress, activeChain, MINT_CLUB, merkleDistributorAbi, parseContractError,
} from "@sekigahara/engine";

const client = createPublicClient({ chain: activeChain, transport: http() });

/**
 * Hook for claiming a Merkle distribution reward.
 *
 * @param {{ distributionId: bigint|null, proof: string[] }} params
 * @returns {{ claim: Function|null, isClaimed: boolean, isClaimedLoading: boolean, isClaiming: boolean }}
 */
export function useClaim({ distributionId, proof }) {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

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
          setIsClaiming(true);
          try {
            const hash = await writeContractAsync({
              address: MINT_CLUB.MERKLE,
              abi: merkleDistributorAbi,
              functionName: "claim",
              args: [distributionId, proof],
            });

            await client.waitForTransactionReceipt({ hash });

            // Update isClaimed in the query cache so UI switches immediately
            const merkleAddr = MINT_CLUB.MERKLE.toLowerCase();
            for (const query of queryClient.getQueryCache().findAll({ queryKey: ["readContract"] })) {
              const params = query.queryKey[1];
              if (!params || params.address?.toLowerCase() !== merkleAddr) continue;
              if (params.functionName !== "isClaimed") continue;
              if (params.args?.[0] !== distributionId) continue;
              if (params.args?.[1]?.toLowerCase() !== address.toLowerCase()) continue;
              queryClient.setQueryData(query.queryKey, true);
            }
            queryClient.refetchQueries({ queryKey: ["readContract"] });

            toast.success(t("toast.claimSuccess"));
            setIsClaiming(false);
            return hash;
          } catch (err) {
            setIsClaiming(false);
            const { key, params } = parseContractError(err);
            toast.error(t("toast.claimFailed"), {
              description: t(key, params),
            });
            throw err;
          }
        }
      : null;

  return {
    claim,
    isClaimed: !!isClaimed,
    isClaimedLoading: !!isClaimedLoading,
    isClaiming,
  };
}
