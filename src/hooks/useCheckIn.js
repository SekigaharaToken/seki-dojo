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

/**
 * Hook for performing a daily check-in attestation via EAS,
 * then auto-claiming the daily holdings bonus if available.
 *
 * Two-step flow:
 * 1. EAS attestation (existing behavior)
 * 2. If attestation succeeds AND user has DOJO holdings → claimDailyBonus()
 */
export function useCheckIn() {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, isError, error } = useWriteContract();
  const {
    estimatedBonus,
    formattedBonus,
    claim: claimBonus,
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

      // Wait for receipt, then query the Attested log from that exact block
      client
        .waitForTransactionReceipt({ hash })
        .then((receipt) =>
          client.getLogs({
            address: EAS_ADDRESS,
            event: parseAbiItem(
              "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
            ),
            args: {
              attester: address,
              schemaUID: DOJO_SCHEMA_UID,
            },
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          }),
        )
        .then((logs) => {
          if (logs.length === 0) return;
          const newEntries = logs.map((log) => ({
            timestamp: Number(log.blockNumber),
            day: Math.floor(Number(log.blockNumber) / SECONDS_PER_DAY),
          }));
          queryClient.setQueryData(
            ["checkInHistory", address],
            (prev) => [...(prev ?? []), ...newEntries],
          );
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: ["checkInHistory"] });
        });

      // Step 2: Auto-claim daily bonus if configured and user has holdings
      if (bonusConfigured && estimatedBonus > 0n) {
        try {
          await claimBonus();
          toast.success(t("toast.bonusSuccess", { amount: formattedBonus }));
        } catch {
          // Attestation already succeeded — don't fail the whole check-in
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

  return {
    checkIn,
    isPending,
    isError,
    error,
  };
}
