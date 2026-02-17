import { useTranslation } from "react-i18next";
import { formatUnits } from "viem";
import { useTokenPrice } from "@/hooks/useTokenPrice.js";
import { DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RESERVE_LABEL = DOJO_TOKEN_ADDRESS ? "$SEKI" : "ETH";

/**
 * Displays the current bonding curve price.
 */
export function PriceDisplay() {
  const { t } = useTranslation();
  const { buyPrice, sellPrice, isLoading, isError } = useTokenPrice();

  return (
    <Card className="w-full max-w-sm animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-center">{t("swap.price")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            {t("errors.networkError")}
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold">
              {formatUnits(buyPrice, 18)} {RESERVE_LABEL}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("swap.sell")}: {formatUnits(sellPrice, 18)} {RESERVE_LABEL}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
