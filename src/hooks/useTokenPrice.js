import { useQuery } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { mintclub } from "@/lib/mintclub.js";
import { SWAP_TOKEN_ADDRESS, SWAP_NETWORK } from "@/config/contracts.js";

const ONE_TOKEN = parseUnits("1", 18);

/**
 * Fetches the current buy and sell price for 1 token from the bonding curve.
 *
 * @returns {{ buyPrice: bigint|null, sellPrice: bigint|null, isLoading: boolean, isError: boolean }}
 */
export function useTokenPrice() {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tokenPrice", SWAP_TOKEN_ADDRESS],
    queryFn: async () => {
      const token = mintclub.network(SWAP_NETWORK).token(SWAP_TOKEN_ADDRESS);
      const [reserveAmount, royalty] = await token.getBuyEstimation(ONE_TOKEN);
      return { buyPrice: reserveAmount, royalty };
    },
    enabled: !!SWAP_TOKEN_ADDRESS,
    staleTime: 10_000,
    retry: false,
  });

  return {
    buyPrice: data?.buyPrice ?? null,
    royalty: data?.royalty ?? null,
    isLoading,
    isError,
  };
}
