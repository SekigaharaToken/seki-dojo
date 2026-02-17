import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button.jsx";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";
import { useStreak } from "@/hooks/useStreak.js";
import { useCheckIn } from "@/hooks/useCheckIn.js";
import { useDailyBonus } from "@/hooks/useDailyBonus.js";
import { useLoginModal } from "@/hooks/useLoginModal.js";

export function CheckInButton() {
  const { t } = useTranslation();
  const { address, canTransact } = useWalletAddress();
  const { isAuthenticated } = useFarcaster();
  const { hasCheckedInToday, isLoading: streakLoading } = useStreak(address);
  const { checkIn, retryBonus, isPending, bonusClaimPending, bonusFailed } = useCheckIn();
  const {
    canClaim: canClaimBonus,
    estimatedBonus,
    formattedBonus,
    bonusRatePercent,
    isPending: bonusDirectPending,
    isConfigured: bonusConfigured,
    dojoBalance,
  } = useDailyBonus();
  const { openLoginModal } = useLoginModal();
  const { openConnectModal } = useConnectModal();

  const anyPending = isPending || bonusClaimPending || bonusDirectPending;

  // After check-in, if bonus claim failed or is still available, show "Claim Bonus"
  const showClaimBonusMode = hasCheckedInToday && canClaimBonus && bonusConfigured;

  const isDisabled = anyPending || (hasCheckedInToday && !showClaimBonusMode) || (canTransact && streakLoading);

  function handleClick() {
    if (!canTransact) {
      if (isAuthenticated) {
        toast.info(t("errors.connectWalletToTransact"));
        openConnectModal?.();
      } else {
        toast.info(t("errors.walletNotConnected"));
        openLoginModal();
      }
      return;
    }

    if (showClaimBonusMode) {
      retryBonus();
      return;
    }

    checkIn().catch(() => {});
  }

  function getLabel() {
    if (!address) return t("wallet.connect");
    if (anyPending) return t("checkin.buttonPending");
    if (showClaimBonusMode) return t("dailyBonus.claim");
    if (hasCheckedInToday) return t("checkin.buttonDone");
    return t("checkin.button");
  }

  const showPulse = canTransact && !hasCheckedInToday && !anyPending && !streakLoading;
  const showBonusPreview = canTransact && !hasCheckedInToday && bonusConfigured && dojoBalance > 0n;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        onClick={handleClick}
        disabled={isDisabled}
        className={`min-w-48 text-lg ${showPulse ? "animate-gentle-pulse" : ""}`}
      >
        {anyPending && (
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
        )}
        {getLabel()}
      </Button>

      {showBonusPreview && (
        <p className="text-muted-foreground text-sm">
          {t("dailyBonus.estimated", { amount: formattedBonus })}
          {" "}
          ({t("dailyBonus.rate", { rate: bonusRatePercent.toFixed(2) })})
        </p>
      )}

      {bonusFailed && hasCheckedInToday && (
        <p className="text-destructive text-sm">{t("toast.bonusFailed")}</p>
      )}
    </div>
  );
}
