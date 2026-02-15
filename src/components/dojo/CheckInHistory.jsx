import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { useCheckInHistory } from "@/hooks/useCheckInHistory.js";

export function CheckInHistory() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { checkIns, totalCheckIns, isLoading } = useCheckInHistory(address);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("history.noHistory")}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("history.totalCheckins")}: <span className="font-medium">{totalCheckIns}</span>
            </p>
            <ul className="flex flex-wrap gap-1" aria-label={t("history.title")}>
              {checkIns.map((entry, i) => (
                <li
                  key={i}
                  className="h-3 w-3 rounded-sm bg-primary"
                  aria-label={new Date(entry.timestamp * 1000).toLocaleDateString()}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
