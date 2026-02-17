import { useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, encodePacked } from "viem";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "./useMiniAppContext.js";
import { DOJO_TOKEN_ADDRESS, DOJO_FAUCET_ADDRESS } from "@/config/contracts.js";
import { dojoFaucetAbi } from "@/config/abis/dojoFaucet.js";
import { getEnv } from "@/config/env.js";
import { getCached, setCachedOnce } from "@/lib/immutableCache.js";

const FAUCET_SECRET = getEnv("VITE_FAUCET_SECRET", "");

// Steps: idle → prompting → adding → claiming → done
const STEPS = { IDLE: "idle", PROMPTING: "prompting", ADDING: "adding", CLAIMING: "claiming", DONE: "done" };

/**
 * Orchestrates the onboarding flow for new MiniApp users:
 * 1. Detect first-time user (not added + zero balance)
 * 2. Prompt to add app via sdk.actions.addFrame()
 * 3. Claim welcome bonus via DojoFaucet contract
 */
export function useOnboarding() {
  const { address } = useAccount();
  const { isInMiniApp, isAppAdded } = useMiniAppContext();
  const [step, setStep] = useState(STEPS.IDLE);
  const [error, setError] = useState(null);

  const { data: dojoBalance } = useReadContract({
    address: DOJO_TOKEN_ADDRESS || undefined,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] }],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && DOJO_TOKEN_ADDRESS), staleTime: 60_000 },
  });

  const faucetCacheKey = address ? `faucetClaimed:${address}` : null;
  const cachedClaimed = faucetCacheKey ? getCached(faucetCacheKey) : false;

  const { data: onchainClaimed } = useReadContract({
    address: DOJO_FAUCET_ADDRESS || undefined,
    abi: dojoFaucetAbi,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && DOJO_FAUCET_ADDRESS) && !cachedClaimed,
      staleTime: 60_000,
    },
  });

  const alreadyClaimed = cachedClaimed || onchainClaimed;
  if (alreadyClaimed && faucetCacheKey) setCachedOnce(faucetCacheKey, true);

  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Show onboarding: in MiniApp, app not added, zero balance, hasn't claimed
  const shouldOnboard =
    isInMiniApp &&
    !isAppAdded &&
    dojoBalance === 0n &&
    !alreadyClaimed &&
    Boolean(DOJO_FAUCET_ADDRESS) &&
    Boolean(FAUCET_SECRET) &&
    step !== STEPS.DONE;

  const addApp = useCallback(async () => {
    setStep(STEPS.ADDING);
    setError(null);
    try {
      // addFrame() resolves on success, throws on rejection
      await sdk.actions.addFrame();
      setStep(STEPS.CLAIMING);
    } catch (err) {
      // User rejected or invalid manifest — go back to prompting
      setError(err.message || "Failed to add app");
      setStep(STEPS.PROMPTING);
    }
  }, []);

  const claimWelcomeBonus = useCallback(() => {
    if (!address || !FAUCET_SECRET || !DOJO_FAUCET_ADDRESS) return;
    setError(null);
    const proof = keccak256(encodePacked(["bytes32", "address"], [FAUCET_SECRET, address]));
    writeContract(
      {
        address: DOJO_FAUCET_ADDRESS,
        abi: dojoFaucetAbi,
        functionName: "claim",
        args: [proof],
      },
      {
        onError: (err) => {
          setError(err.shortMessage || err.message || "Claim failed");
        },
      },
    );
  }, [address, writeContract]);

  // Auto-transition to done when tx confirms
  if (isConfirmed && step === STEPS.CLAIMING) {
    setStep(STEPS.DONE);
  }

  const startOnboarding = useCallback(() => {
    setStep(STEPS.PROMPTING);
  }, []);

  const dismiss = useCallback(() => {
    setStep(STEPS.DONE);
  }, []);

  return {
    shouldOnboard,
    step,
    startOnboarding,
    addApp,
    claimWelcomeBonus,
    dismiss,
    isLoading: isWritePending || isConfirming,
    isConfirmed,
    error,
  };
}
