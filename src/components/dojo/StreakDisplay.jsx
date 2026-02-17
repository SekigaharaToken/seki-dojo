import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { useStreak } from "@/hooks/useStreak.js";
import { TierBadge } from "./TierBadge.jsx";
import { StreakFire } from "./StreakFire.jsx";

export function StreakDisplay() {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const { currentStreak, longestStreak, currentTier, isLoading, isStreakAtRisk } =
    useStreak(address);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("streak.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <StreakFire streak={currentStreak} />
              <span className="font-serif text-4xl font-bold">{currentStreak}</span>
              <StreakFire streak={currentStreak} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("streak.current")}
            </p>

            {currentTier && <TierBadge tier={currentTier} />}

            <div className="mt-2 text-sm text-muted-foreground">
              {t("streak.longest")}: <span className="font-medium">{longestStreak}</span>
            </div>

            {isStreakAtRisk && (
              <motion.p
                className="text-sm font-medium text-destructive"
                role="alert"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.3 }}
              >
                {t("streak.atRisk")}
              </motion.p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
