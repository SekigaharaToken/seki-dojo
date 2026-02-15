import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button.jsx";
import { useStreak } from "@/hooks/useStreak.js";
import { useCheckIn } from "@/hooks/useCheckIn.js";
import { useLoginModal } from "@/hooks/useLoginModal.js";

export function CheckInButton() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { hasCheckedInToday, isLoading: streakLoading } = useStreak(address);
  const { checkIn, isPending } = useCheckIn();
  const { openLoginModal } = useLoginModal();

  const isDisabled = isPending || hasCheckedInToday || (!!address && streakLoading);

  function handleClick() {
    if (!address) {
      openLoginModal();
      return;
    }
    checkIn();
  }

  function getLabel() {
    if (!address) return t("wallet.connect");
    if (isPending) return t("checkin.buttonPending");
    if (hasCheckedInToday) return t("checkin.buttonDone");
    return t("checkin.button");
  }

  return (
    <Button
      size="lg"
      onClick={handleClick}
      disabled={isDisabled}
      className="min-w-48 text-lg"
    >
      {getLabel()}
    </Button>
  );
}
