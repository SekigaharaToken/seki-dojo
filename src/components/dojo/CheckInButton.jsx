import { useState } from "react";
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
  const { checkIn, isPending } = useCheckIn();
  const {
    canClaim: canClaimBonus,
    estimatedBonus,
    formattedBonus,
    bonusRatePercent,
    claim: claimBonus,
    isPending: bonusPending,
    isConfigured: bonusConfigured,
    dojoBalance,
  } = useDailyBonus();
  const { openLoginModal } = useLoginModal();
  const { openConnectModal } = useConnectModal();
  const [bonusFailed, setBonusFailed] = useState(false);

  const isDisabled = isPending || bonusPending || hasCheckedInToday || (canTransact && streakLoading);

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
    setBonusFailed(false);
    checkIn()
      .catch(() => {})
      .then(() => {
        // If bonus claim failed inside useCheckIn, it toasts bonusFailed
        // We detect this by checking canClaimBonus is still true after check-in
      });
  }

  async function handleRetryBonus() {
    try {
      await claimBonus();
      toast.success(t("toast.bonusSuccess", { amount: formattedBonus }));
      setBonusFailed(false);
    } catch {
      toast.error(t("toast.bonusFailed"));
      setBonusFailed(true);
    }
  }

  function getLabel() {
    if (!address) return t("wallet.connect");
    if (isPending || bonusPending) return t("checkin.buttonPending");
    if (hasCheckedInToday) return t("checkin.buttonDone");
    return t("checkin.button");
  }

  const showPulse = canTransact && !hasCheckedInToday && !isPending && !bonusPending && !streakLoading;
  const showBonusPreview = canTransact && !hasCheckedInToday && bonusConfigured && dojoBalance > 0n;
  const showRetryBonus = hasCheckedInToday && canClaimBonus && bonusConfigured;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        onClick={handleClick}
        disabled={isDisabled}
        className={`min-w-48 text-lg ${showPulse ? "animate-gentle-pulse" : ""}`}
      >
        {(isPending || bonusPending) && (
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

      {showRetryBonus && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetryBonus}
          disabled={bonusPending}
        >
          {bonusPending ? t("toast.bonusPending") : t("dailyBonus.claim")}
        </Button>
      )}

      {bonusFailed && hasCheckedInToday && (
        <p className="text-destructive text-sm">{t("toast.bonusFailed")}</p>
      )}
    </div>
  );
}
