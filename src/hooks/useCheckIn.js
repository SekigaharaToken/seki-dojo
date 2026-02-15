import { useWriteContract, useAccount } from "wagmi";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { EAS_ADDRESS, DOJO_SCHEMA_UID } from "@/config/contracts.js";
import { easAbi } from "@/config/abis/eas.js";
import { APP_IDENTIFIER, SECONDS_PER_DAY } from "@/config/constants.js";

/**
 * Hook for performing a daily check-in attestation via EAS.
 * Calls EAS.attest() with the DOJO schema.
 */
export function useCheckIn() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, isError, error } = useWriteContract();

  async function checkIn() {
    const day = Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);

    const encodedData = encodeAbiParameters(
      parseAbiParameters("string app, uint32 day"),
      [APP_IDENTIFIER, day],
    );

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
            refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
            data: encodedData,
            value: 0n,
          },
        },
      ],
    });

    return hash;
  }

  return {
    checkIn,
    isPending,
    isError,
    error,
  };
}
