import { useReadContract } from "wagmi";
import { DOJO_RESOLVER_ADDRESS } from "@/config/contracts.js";
import { dojoResolverAbi } from "@/config/abis/dojoResolver.js";
import { getTierForStreak, SECONDS_PER_DAY } from "@/config/constants.js";

/**
 * Reads DojoResolver streak state for a given address.
 * Returns raw values plus derived helpers (hasCheckedInToday, currentTier, etc.).
 */
export function useStreak(address) {
  const enabled = !!address;

  const lastCheckInResult = useReadContract({
    address: DOJO_RESOLVER_ADDRESS,
    abi: dojoResolverAbi,
    functionName: "lastCheckIn",
    args: [address],
    enabled,
  });

  const currentStreakResult = useReadContract({
    address: DOJO_RESOLVER_ADDRESS,
    abi: dojoResolverAbi,
    functionName: "currentStreak",
    args: [address],
    enabled,
  });

  const longestStreakResult = useReadContract({
    address: DOJO_RESOLVER_ADDRESS,
    abi: dojoResolverAbi,
    functionName: "longestStreak",
    args: [address],
    enabled,
  });

  const lastCheckIn = Number(lastCheckInResult.data ?? 0n);
  const currentStreak = Number(currentStreakResult.data ?? 0n);
  const longestStreak = Number(longestStreakResult.data ?? 0n);

  const nowSec = Date.now() / 1000 | 0;
  const todayDay = Math.floor(nowSec / SECONDS_PER_DAY);
  const lastDay = Math.floor(lastCheckIn / SECONDS_PER_DAY);

  const hasCheckedInToday = lastCheckIn > 0 && todayDay === lastDay;
  const isStreakAtRisk = !hasCheckedInToday && currentStreak > 0 && lastDay === todayDay - 1;
  const currentTier = getTierForStreak(currentStreak);

  // Seconds until next UTC midnight (0 if not checked in today = can check in now)
  const nextMidnight = (todayDay + 1) * SECONDS_PER_DAY;
  const timeUntilNextCheckIn = hasCheckedInToday ? nextMidnight - nowSec : 0;

  const isLoading = lastCheckInResult.isLoading || currentStreakResult.isLoading || longestStreakResult.isLoading;
  const isError = lastCheckInResult.isError || currentStreakResult.isError || longestStreakResult.isError;

  return {
    currentStreak,
    longestStreak,
    lastCheckIn,
    hasCheckedInToday,
    currentTier,
    timeUntilNextCheckIn,
    isStreakAtRisk,
    isLoading,
    isError,
  };
}
