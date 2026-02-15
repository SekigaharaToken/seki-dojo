import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { mintclub, wei } from "mint.club-v2-sdk";
import { DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Buy/sell $DOJO panel using Mint Club V2 bonding curve.
 */
export function SwapPanel() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const token = mintclub.network("base").token(DOJO_TOKEN_ADDRESS);

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

  if (!address) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">{t("errors.walletNotConnected")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Button
          onClick={handleSubmit}
          disabled={!amount || isPending}
        >
          {mode === "buy" ? t("swap.buy") : t("swap.sell")}
        </Button>
      </CardContent>
    </Card>
  );
}
