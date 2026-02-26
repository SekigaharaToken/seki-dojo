import { useWriteContract } from "wagmi";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useWalletAddress, activeChain, EAS_ADDRESS, easAbi, parseContractError,
} from "@sekigahara/engine";
import { encodeAbiParameters, parseAbiParameters, parseEventLogs, createPublicClient, http } from "viem";
import { DOJO_SCHEMA_UID, DOJO_RESOLVER_ADDRESS } from "@/config/contracts.js";
import { dojoResolverAbi } from "@/config/abis/dojoResolver.js";
import { APP_IDENTIFIER, SECONDS_PER_DAY, getTierForStreak } from "@/config/constants.js";

const bonusPaidAbi = [{
  type: "event",
  name: "BonusPaid",
  inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "rate", type: "uint256", indexed: false },
    { name: "streak", type: "uint256", indexed: false },
  ],
}];

const client = createPublicClient({ chain: activeChain, transport: http() });

/**
 * Hook for performing a daily check-in attestation via EAS.
 * Bonus payout happens automatically inside the resolver — single tx.
 */
export function useCheckIn() {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const { writeContractAsync, isPending, isError, error } = useWriteContract();

  async function checkIn() {
    if (!DOJO_SCHEMA_UID) {
      toast.error(t("toast.checkinFailed"), {
        description: t("errors.notConfigured"),
      });
      return;
    }

    const day = Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);

    const encodedData = encodeAbiParameters(
      parseAbiParameters("string app, uint32 day"),
      [APP_IDENTIFIER, day],
    );

    try {
      const hash = await writeContractAsync({
        address: EAS_ADDRESS,
        abi: easAbi,
        functionName: "attest",
        args: [
          {
            schema: DOJO_SCHEMA_UID,
            data: {
              recipient: address,
              expirationTime: 0n,
              revocable: false,
              refUID:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              data: encodedData,
              value: 0n,
            },
          },
        ],
      });

      // Wait for confirmation so streak state is updated onchain
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Try to extract streak from the BonusPaid event (zero extra RPCs).
      // Falls back to readContract if the event wasn't emitted (user had 0 $DOJO).
      let streak;
      try {
        const logs = parseEventLogs({ abi: bonusPaidAbi, logs: receipt.logs });
        const bonusLog = logs.find(
          (l) => l.eventName === "BonusPaid" && l.args.user?.toLowerCase() === address.toLowerCase(),
        );
        if (bonusLog) {
          streak = Number(bonusLog.args.streak);
        }
      } catch {
        // parseEventLogs may throw if no matching logs — fall through
      }

      if (streak == null) {
        const raw = await client.readContract({
          address: DOJO_RESOLVER_ADDRESS,
          abi: dojoResolverAbi,
          functionName: "currentStreak",
          args: [address],
        });
        streak = Number(raw);
      }

      // UI updates are handled by useResolverEvents which watches BonusPaid
      // events and writes directly into the TanStack Query cache.

      return {
        hash,
        currentStreak: streak,
        currentTier: getTierForStreak(streak),
      };
    } catch (err) {
      const { key, params } = parseContractError(err);
      toast.error(t("toast.checkinFailed"), {
        description: t(key, params),
      });
      throw err;
    }
  }

  return {
    checkIn,
    isPending,
    isError,
    error,
  };
}
