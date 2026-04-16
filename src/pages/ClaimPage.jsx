import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@sekigahara/engine";
import { merkleDistributorAbi } from "@/config/abis/merkleDistributor.js";
import { MINT_CLUB } from "@/config/contracts.js";

export default function ClaimPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const distributionId = searchParams.get("id");
  const proofParam = searchParams.get("proof");
  const eligibleAddress = searchParams.get("address");

  // Parse proof from comma-separated hex strings
  const proof = proofParam ? proofParam.split(",") : [];

  // Validate required params
  if (!distributionId || !proofParam || !eligibleAddress) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold">{t("claim.invalidParams")}</p>
        <Link to="/">
          <Button variant="outline">{t("claim.backToDojo")}</Button>
        </Link>
      </div>
    );
  }

  // Check if already claimed
  const { data: alreadyClaimed, isLoading: checkingClaimed } = useReadContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "isClaimed",
    args: [BigInt(distributionId), eligibleAddress],
  });

  const { writeContractAsync } = useWriteContract();

  const connectedLower = address?.toLowerCase();
  const eligibleLower = eligibleAddress.toLowerCase();
  const isWrongWallet = isConnected && connectedLower !== eligibleLower;

  async function handleClaim() {
    setIsClaiming(true);
    try {
      await writeContractAsync({
        address: MINT_CLUB.MERKLE,
        abi: merkleDistributorAbi,
        functionName: "claim",
        args: [BigInt(distributionId), proof],
      });
      setClaimSuccess(true);
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setIsClaiming(false);
    }
  }

  // Already claimed (from onchain check or after successful claim)
  if (alreadyClaimed || claimSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold">{t("claim.alreadyClaimed")}</h1>
        <p className="text-muted-foreground">
          {claimSuccess ? t("claim.success") : t("claim.alreadyClaimedDesc")}
        </p>
        <Link to="/">
          <Button variant="outline">{t("claim.backToDojo")}</Button>
        </Link>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
        <p className="text-muted-foreground">{t("claim.connectWallet")}</p>
        <Button variant="primary" onClick={openConnectModal}>
          {t("claim.connectWallet")}
        </Button>
      </div>
    );
  }

  // Wrong wallet
  if (isWrongWallet) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
        <p className="text-muted-foreground">
          {t("claim.wrongWallet", {
            address: `${eligibleAddress.slice(0, 6)}...${eligibleAddress.slice(-4)}`,
          })}
        </p>
      </div>
    );
  }

  // Ready to claim
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
      <Button
        variant="primary"
        onClick={handleClaim}
        disabled={isClaiming || checkingClaimed}
      >
        {isClaiming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("claim.claiming")}
          </>
        ) : (
          t("claim.claimButton", { reward: "" })
        )}
      </Button>
    </div>
  );
}
