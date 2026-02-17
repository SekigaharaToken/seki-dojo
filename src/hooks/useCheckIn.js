import { useState } from "react";
import { useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useDailyBonus } from "@/hooks/useDailyBonus.js";
import {
  encodeAbiParameters,
  parseAbiParameters,
  createPublicClient,
  http,
  parseAbiItem,
} from "viem";
import { activeChain } from "@/config/chains.js";
import { EAS_ADDRESS, DOJO_SCHEMA_UID } from "@/config/contracts.js";
import { easAbi } from "@/config/abis/eas.js";
import { APP_IDENTIFIER, SECONDS_PER_DAY } from "@/config/constants.js";
import { parseContractError } from "@/lib/parseContractError.js";

const client = createPublicClient({
  chain: activeChain,
  transport: http(),
});

const attestedEvent = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
);

/**
 * Hook for performing a daily check-in attestation via EAS,
 * then auto-claiming the daily holdings bonus if available.
 *
 * Two-step flow:
 * 1. EAS attestation
 * 2. Wait for Attested event → claimDailyBonus()
 *
 * If the bonus claim fails, `bonusPending` is set so the
 * CheckInButton can show a "Claim Bonus" retry state.
 */
export function useCheckIn() {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, isError, error } = useWriteContract();
  const [bonusFailed, setBonusFailed] = useState(false);
  const {
    estimatedBonus,
    formattedBonus,
    claim: claimBonus,
    refetchCanClaim,
    isPending: bonusClaimPending,
    isConfigured: bonusConfigured,
  } = useDailyBonus();

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

    setBonusFailed(false);

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

      toast.success(t("toast.checkinSuccess"));

      // Wait for confirmation and get the Attested event log.
      // The event proves the resolver accepted the attestation and
      // updated lastCheckIn — safe to call claimDailyBonus after this.
      const receipt = await client.waitForTransactionReceipt({ hash });
      const logs = await client.getLogs({
        address: EAS_ADDRESS,
        event: attestedEvent,
        args: { attester: address, schemaUID: DOJO_SCHEMA_UID },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      // Update check-in history cache
      if (logs.length > 0) {
        const newEntries = logs.map((log) => ({
          timestamp: Number(log.blockNumber),
          day: Math.floor(Number(log.blockNumber) / SECONDS_PER_DAY),
        }));
        queryClient.setQueryData(
          ["checkInHistory", address],
          (prev) => [...(prev ?? []), ...newEntries],
        );
      }

      // Step 2: Auto-claim daily bonus now that Attested event is confirmed
      if (bonusConfigured && estimatedBonus > 0n) {
        try {
          await claimBonus();
          refetchCanClaim();
          toast.success(t("toast.bonusSuccess", { amount: formattedBonus }));
        } catch {
          setBonusFailed(true);
          toast.error(t("toast.bonusFailed"));
        }
      }

      return hash;
    } catch (err) {
      const { key, params } = parseContractError(err);
      toast.error(t("toast.checkinFailed"), {
        description: t(key, params),
      });
      throw err;
    }
  }

  async function retryBonus() {
    setBonusFailed(false);
    try {
      await claimBonus();
      refetchCanClaim();
      toast.success(t("toast.bonusSuccess", { amount: formattedBonus }));
    } catch {
      setBonusFailed(true);
      toast.error(t("toast.bonusFailed"));
    }
  }

  return {
    checkIn,
    retryBonus,
    isPending,
    bonusClaimPending,
    bonusFailed,
    isError,
    error,
  };
}
