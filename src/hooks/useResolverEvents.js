import { useEffect } from "react";
import { usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletAddress } from "@sekigahara/engine";
import { DOJO_RESOLVER_ADDRESS } from "@/config/contracts.js";

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

/**
 * Watches BonusPaid events on the DojoResolver contract.
 * When the current user's event fires, invalidates streak and history queries
 * so the UI updates immediately without polling the chain.
 *
 * Follows the SecondOrder `useCurveEvents` pattern:
 * client.watchContractEvent({ poll: true, onLogs })
 */
export function useResolverEvents() {
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const { address } = useWalletAddress();

  useEffect(() => {
    if (!DOJO_RESOLVER_ADDRESS || !client || !address) return;

    let unwatch = null;
    let mounted = true;

    (async () => {
      unwatch = client.watchContractEvent({
        address: DOJO_RESOLVER_ADDRESS,
        abi: bonusPaidAbi,
        eventName: "BonusPaid",
        poll: true,
        onLogs: (logs) => {
          if (!mounted || !logs?.length) return;

          for (const log of logs) {
            const eventUser = log.args.user?.toLowerCase();
            if (eventUser !== address.toLowerCase()) continue;

            const streak = Number(log.args.streak);
            const nowTimestamp = BigInt(Math.floor(Date.now() / 1000));
            const resolverAddr = DOJO_RESOLVER_ADDRESS.toLowerCase();
            const userAddr = address.toLowerCase();

            // Write event data directly into TanStack Query cache
            for (const query of queryClient.getQueryCache().findAll({ queryKey: ["readContract"] })) {
              const params = query.queryKey[1];
              if (!params || params.address?.toLowerCase() !== resolverAddr) continue;
              if (params.args?.[0]?.toLowerCase() !== userAddr) continue;

              const fn = params.functionName;
              if (fn === "currentStreak") {
                queryClient.setQueryData(query.queryKey, BigInt(streak));
              } else if (fn === "lastCheckIn") {
                queryClient.setQueryData(query.queryKey, nowTimestamp);
              } else if (fn === "longestStreak") {
                const old = query.state.data;
                if (old == null || BigInt(streak) > old) {
                  queryClient.setQueryData(query.queryKey, BigInt(streak));
                }
              }
            }

            // Invalidate for background refetch confirmation + history
            queryClient.invalidateQueries({ queryKey: ["readContract"] });
            queryClient.invalidateQueries({ queryKey: ["checkInHistory", address] });
          }
        },
      });
    })();

    return () => {
      mounted = false;
      if (unwatch) unwatch();
    };
  }, [client, address, queryClient]);
}
