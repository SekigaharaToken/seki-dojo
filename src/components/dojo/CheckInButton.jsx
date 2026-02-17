import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button.jsx";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";
import { useStreak } from "@/hooks/useStreak.js";
import { useCheckIn } from "@/hooks/useCheckIn.js";
import { useLoginModal } from "@/hooks/useLoginModal.js";
import { useShareStreak } from "@/hooks/useShareStreak.js";

export function CheckInButton() {
  const { t } = useTranslation();
  const { address, canTransact } = useWalletAddress();
  const { isAuthenticated } = useFarcaster();
  const { hasCheckedInToday, isLoading: streakLoading, currentStreak, currentTier } = useStreak(address);
  const { shareStreak } = useShareStreak({ currentStreak, currentTier });
  const { checkIn, isPending } = useCheckIn();
  const { openLoginModal } = useLoginModal();
  const { openConnectModal } = useConnectModal();

  const isDisabled = isPending || hasCheckedInToday || (canTransact && streakLoading);

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

    checkIn().catch(() => {});
  }

  function getLabel() {
    if (!address) return t("wallet.connect");
    if (isPending) return t("checkin.buttonPending");
    if (hasCheckedInToday) return t("checkin.buttonDone");
    return t("checkin.button");
  }

  const showPulse = canTransact && !hasCheckedInToday && !isPending && !streakLoading;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="lg"
        onClick={handleClick}
        disabled={isDisabled}
        className={`min-w-48 text-lg ${showPulse ? "animate-gentle-pulse" : ""}`}
      >
        {isPending && (
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
        )}
        {getLabel()}
      </Button>

      {hasCheckedInToday && (
        <Button
          size="lg"
          className="text-white"
          style={{ backgroundColor: "#855DCD" }}
          onClick={shareStreak}
          aria-label={t("share.toFarcaster")}
        >
          <img src="/farcaster-icon-white.svg" alt="" className="size-5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
