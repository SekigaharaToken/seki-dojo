import { useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useStreak } from "@/hooks/useStreak.js";
import { DAILY_BONUS_ADDRESS, DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";
import { dailyBonusAbi } from "@/config/abis/dailyBonus.js";
import {
  DAILY_BONUS_BASE_RATE,
  DAILY_BONUS_MAX_RATE,
  DAILY_BONUS_RAMP_DAYS,
  BASIS_POINTS,
} from "@/config/constants.js";

const erc20BalanceOf = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

/**
 * Hook for reading DailyBonus contract state and claiming the daily bonus.
 */
export function useDailyBonus() {
  const { address } = useWalletAddress();
  const { currentStreak } = useStreak(address);
  const { writeContractAsync, isPending } = useWriteContract();

  const enabled = !!address && !!DAILY_BONUS_ADDRESS;

  const { data: canClaim, isLoading: canClaimLoading, refetch: refetchCanClaim } = useReadContract({
    address: DAILY_BONUS_ADDRESS,
    abi: dailyBonusAbi,
    functionName: "canClaimToday",
    args: [address],
    enabled,
  });

  const { data: estimatedBonus } = useReadContract({
    address: DAILY_BONUS_ADDRESS,
    abi: dailyBonusAbi,
    functionName: "calculateBonus",
    args: [address],
    enabled,
  });

  const { data: dojoBalance } = useReadContract({
    address: DOJO_TOKEN_ADDRESS,
    abi: erc20BalanceOf,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address && !!DOJO_TOKEN_ADDRESS,
  });

  // Mirror contract's getBonusRate logic for display
  function getBonusRate(streak) {
    if (streak >= DAILY_BONUS_RAMP_DAYS) return DAILY_BONUS_MAX_RATE;
    return (
      DAILY_BONUS_BASE_RATE +
      Math.floor(
        ((DAILY_BONUS_MAX_RATE - DAILY_BONUS_BASE_RATE) * streak) /
          DAILY_BONUS_RAMP_DAYS,
      )
    );
  }

  const bonusRate = getBonusRate(currentStreak);
  const formattedBonus = estimatedBonus
    ? formatUnits(estimatedBonus, 18)
    : "0";
  const bonusRatePercent = (bonusRate / BASIS_POINTS) * 100;

  async function claim() {
    return writeContractAsync({
      address: DAILY_BONUS_ADDRESS,
      abi: dailyBonusAbi,
      functionName: "claimDailyBonus",
    });
  }

  return {
    canClaim: !!canClaim,
    canClaimLoading,
    estimatedBonus: estimatedBonus ?? 0n,
    formattedBonus,
    dojoBalance: dojoBalance ?? 0n,
    bonusRate,
    bonusRatePercent,
    claim,
    refetchCanClaim,
    isPending,
    isConfigured: !!DAILY_BONUS_ADDRESS,
  };
}
