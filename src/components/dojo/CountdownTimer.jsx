import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { useStreak } from "@/hooks/useStreak.js";
import { SECONDS_PER_DAY } from "@/config/constants.js";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function CountdownTimer() {
  const { t } = useTranslation();
  const { address } = useAccount();
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

  return (
    <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
      {t("streak.nextCheckin", { time: formatTime(remaining) })}
    </p>
  );
}
