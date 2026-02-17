import { useTranslation } from "react-i18next";
import { formatUnits, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { mintclub } from "@/lib/mintclub.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ONE_TOKEN = parseUnits("1", 18);

function formatPrice(wei) {
  return parseFloat(formatUnits(wei, 18)).toFixed(8);
}

/**
 * Displays the current bonding curve price for a given token.
 */
export function PriceDisplay({ tokenConfig }) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tokenPrice", tokenConfig.address],
    queryFn: async () => {
      const token = mintclub.network(tokenConfig.network).token(tokenConfig.address);
      const [reserveAmount, royalty] = await token.getBuyEstimation(ONE_TOKEN);
      return { buyPrice: reserveAmount, royalty };
    },
    enabled: !!tokenConfig.address,
    staleTime: 10_000,
    retry: false,
  });

  return (
    <Card className="w-full max-w-sm animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-center">{t(tokenConfig.priceKey)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            {t("errors.networkError")}
          </p>
        ) : (
          <p className="text-2xl font-bold">
            {formatPrice(data?.buyPrice ?? 0n)} {tokenConfig.reserveLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
