import { useQuery } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { mintclub } from "mint.club-v2-sdk";
import { DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";

const ONE_TOKEN = parseUnits("1", 18);

/**
 * Fetches the current buy and sell price for 1 $DOJO from the bonding curve.
 *
 * @returns {{ buyPrice: bigint|null, sellPrice: bigint|null, isLoading: boolean, isError: boolean }}
 */
export function useTokenPrice() {
  const token = mintclub.network("base").token(DOJO_TOKEN_ADDRESS);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tokenPrice", DOJO_TOKEN_ADDRESS],
    queryFn: async () => {
      const [buyResult, sellResult] = await Promise.all([
        token.getBuyEstimation(ONE_TOKEN),
        token.getSellEstimation(ONE_TOKEN),
      ]);
      return {
        buyPrice: buyResult[0],
        sellPrice: sellResult[0],
      };
    },
    staleTime: 10_000,
    retry: false,
  });

  return {
    buyPrice: data?.buyPrice ?? null,
    sellPrice: data?.sellPrice ?? null,
    isLoading,
    isError,
  };
}
