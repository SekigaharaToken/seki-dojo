import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import NumberFlow from "@number-flow/react";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useStreak } from "@/hooks/useStreak.js";

export function CountdownTimer() {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const { hasCheckedInToday, timeUntilNextCheckIn } = useStreak(address);
  const [remaining, setRemaining] = useState(timeUntilNextCheckIn);

  useEffect(() => {
    setRemaining(timeUntilNextCheckIn);
  }, [timeUntilNextCheckIn]);

  useEffect(() => {
    if (!hasCheckedInToday || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasCheckedInToday, remaining > 0]);

  if (!hasCheckedInToday) return null;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  return (
    <p className="font-mono text-sm text-muted-foreground tabular-nums" aria-live="polite" aria-atomic="true">
      {t("streak.nextCheckin")}
      <NumberFlow value={h} />h{" "}
      <NumberFlow value={m} format={{ minimumIntegerDigits: 2 }} />m{" "}
      <NumberFlow value={s} format={{ minimumIntegerDigits: 2 }} />s
    </p>
  );
}
