import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { mintclub, wei } from "mint.club-v2-sdk";
import { SWAP_TOKEN_ADDRESS, SWAP_NETWORK, DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const RESERVE_LABEL = DOJO_TOKEN_ADDRESS ? "$SEKI" : "ETH";

function formatPrice(value) {
  return parseFloat(formatUnits(value, 18)).toFixed(8);
}

/**
 * Buy/sell panel using Mint Club V2 bonding curve.
 */
export function SwapPanel() {
  const { t } = useTranslation();
  const { address, canTransact } = useWalletAddress();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const token = mintclub.network(SWAP_NETWORK).token(SWAP_TOKEN_ADDRESS);

  const parsedAmount = amount && Number(amount) > 0
    ? parseUnits(amount, 18)
    : null;

  const { data: estimation, isLoading: estimationLoading } = useQuery({
    queryKey: ["swapEstimation", SWAP_TOKEN_ADDRESS, mode, amount],
    queryFn: async () => {
      const fn = mode === "buy"
        ? token.getBuyEstimation(parsedAmount)
        : token.getSellEstimation(parsedAmount);
      const [cost, royalty] = await fn;
      return { cost, royalty };
    },
    enabled: !!parsedAmount,
    staleTime: 5_000,
    retry: false,
  });

  async function handleSubmit() {
    if (!amount || !address) return;
    setIsPending(true);
    try {
      const amountWei = wei(amount);
      if (mode === "buy") {
        await token.buy({ amount: amountWei, slippage: 2 });
      } else {
        await token.sell({ amount: amountWei, slippage: 2 });
      }
      setAmount("");
    } finally {
      setIsPending(false);
    }
  }

  if (!canTransact) {
    return (
      <Card className="w-full max-w-sm animate-fade-in-up">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">{t("errors.walletNotConnected")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-center">{t("swap.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="buy" className="flex-1">
              {t("swap.buy")}
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex-1">
              {t("swap.sell")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          type="number"
          min="0"
          placeholder={t("swap.amount")}
          aria-label={t("swap.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {parsedAmount && (
          <div className="rounded-md border px-3 py-2 text-sm">
            {estimationLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : estimation ? (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("swap.cost")}</span>
                  <span className="font-medium">
                    {formatPrice(estimation.cost)} {RESERVE_LABEL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("swap.fee")}</span>
                  <span className="font-medium">
                    {formatPrice(estimation.royalty)} {RESERVE_LABEL}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground font-medium">
                    {mode === "buy" ? t("swap.totalCost") : t("swap.receive")}
                  </span>
                  <span className="font-bold">
                    {formatPrice(estimation.cost + estimation.royalty)} {RESERVE_LABEL}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!amount || isPending}
        >
          {mode === "buy" ? t("swap.buy") : t("swap.sell")}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          {t("swap.gasDisclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
