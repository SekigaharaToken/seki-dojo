import { useEffect } from "react";
import { usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletAddress, EAS_ADDRESS } from "@sekigahara/engine";
import { DOJO_SCHEMA_UID, DOJO_RESOLVER_ADDRESS } from "@/config/contracts.js";

const attestedAbi = [{
  type: "event",
  name: "Attested",
  inputs: [
    { name: "recipient", type: "address", indexed: true },
    { name: "attester", type: "address", indexed: true },
    { name: "uid", type: "bytes32", indexed: false },
    { name: "schemaUID", type: "bytes32", indexed: true },
  ],
}];

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
 * Watches EAS Attested events for the DOJO schema and BonusPaid events
 * on the DojoResolver. When the current user's attestation fires,
 * invalidates streak + history queries so the UI updates immediately.
 *
 * Follows the SecondOrder `useCurveEvents` pattern:
 * client.watchContractEvent({ poll: true, onLogs })
 */
export function useResolverEvents() {
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const { address } = useWalletAddress();

  // Watch EAS Attested event — always fires on successful check-in
  useEffect(() => {
    if (!client || !address || !DOJO_SCHEMA_UID) return;

    let unwatch = null;
    let mounted = true;

    (async () => {
      try {
        unwatch = client.watchContractEvent({
          address: EAS_ADDRESS,
          abi: attestedAbi,
          eventName: "Attested",
          poll: true,
          onLogs: (logs) => {
            if (!mounted || !logs?.length) return;

            for (const log of logs) {
              // Filter: only our schema, only current user
              if (log.args.schemaUID?.toLowerCase() !== DOJO_SCHEMA_UID) continue;
              if (log.args.attester?.toLowerCase() !== address.toLowerCase()) continue;

              // Attestation confirmed — invalidate all streak + history queries
              queryClient.invalidateQueries({ queryKey: ["readContract"] });
              queryClient.invalidateQueries({ queryKey: ["checkInHistory", address] });
            }
          },
        });
      } catch (_) {
        // non-fatal
      }
    })();

    return () => {
      mounted = false;
      try { unwatch && unwatch(); } catch (_) { /* noop */ }
    };
  }, [client, address, queryClient]);

  // Watch BonusPaid event — fires when user has $DOJO and gets a bonus.
  // Extracts streak from event args to write directly into query cache
  // for instant UI update (before the invalidation refetch completes).
  useEffect(() => {
    if (!client || !address || !DOJO_RESOLVER_ADDRESS) return;

    let unwatch = null;
    let mounted = true;

    (async () => {
      try {
        unwatch = client.watchContractEvent({
          address: DOJO_RESOLVER_ADDRESS,
          abi: bonusPaidAbi,
          eventName: "BonusPaid",
          poll: true,
          onLogs: (logs) => {
            if (!mounted || !logs?.length) return;

            for (const log of logs) {
              if (log.args.user?.toLowerCase() !== address.toLowerCase()) continue;

              const streak = Number(log.args.streak);
              const nowTimestamp = BigInt(Math.floor(Date.now() / 1000));
              const resolverAddr = DOJO_RESOLVER_ADDRESS.toLowerCase();
              const userAddr = address.toLowerCase();

              // Write streak data directly into cache for instant update
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
            }
          },
        });
      } catch (_) {
        // non-fatal
      }
    })();

    return () => {
      mounted = false;
      try { unwatch && unwatch(); } catch (_) { /* noop */ }
    };
  }, [client, address, queryClient]);
}
