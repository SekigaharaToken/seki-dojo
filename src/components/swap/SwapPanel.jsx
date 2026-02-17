import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { mintclub } from "@/lib/mintclub.js";
import { wei } from "mint.club-v2-sdk";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { AnimatedTabsList, AnimatedTabsTrigger } from "@/components/ui/animated-tabs.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatPrice(value) {
  return parseFloat(formatUnits(value, 18)).toFixed(8);
}

function EstimationRows({ estimation, mode, tokenConfig, animate, t }) {
  const Row = animate ? motion.div : "div";
  const stagger = (i) => animate
    ? { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: 0.2 + i * 0.1 } }
    : {};

  return (
    <div className="flex flex-col gap-1">
      <Row className="flex justify-between" {...stagger(0)}>
        <span className="text-muted-foreground">{t("swap.cost")}</span>
        <span className="font-medium">
          {formatPrice(estimation.cost)} {tokenConfig.reserveLabel}
        </span>
      </Row>
      <Row className="flex justify-between" {...stagger(1)}>
        <span className="text-muted-foreground">{t("swap.fee")}</span>
        <span className="font-medium">
          {formatPrice(estimation.royalty)} {tokenConfig.reserveLabel}
        </span>
      </Row>
      <Row className="flex justify-between border-t pt-1" {...stagger(2)}>
        <span className="text-muted-foreground font-medium">
          {mode === "buy" ? t("swap.totalCost") : t("swap.receive")}
        </span>
        <span className="font-bold">
          {formatPrice(estimation.cost + estimation.royalty)} {tokenConfig.reserveLabel}
        </span>
      </Row>
    </div>
  );
}

/**
 * Buy/sell panel using Mint Club V2 bonding curve.
 */
export function SwapPanel({ tokenConfig }) {
  const { t } = useTranslation();
  const { address, canTransact } = useWalletAddress();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const token = mintclub.network(tokenConfig.network).token(tokenConfig.address);

  const parsedAmount = amount && Number(amount) > 0
    ? parseUnits(amount, 18)
    : null;

  const { data: estimation, isLoading: estimationLoading } = useQuery({
    queryKey: ["swapEstimation", tokenConfig.address, mode, amount],
    queryFn: async () => {
      const fn = mode === "buy"
        ? token.getBuyEstimation(parsedAmount)
        : token.getSellEstimation(parsedAmount);
      const [cost, royalty] = await fn;
      return { cost, royalty };
    },
    enabled: !!parsedAmount,
    placeholderData: (prev) => prev,
    staleTime: 5_000,
    retry: false,
  });

  // Track whether the estimation rows have already stagger-animated
  const hasStaggered = useRef(false);
  if (!parsedAmount) hasStaggered.current = false;

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
      <Card className="w-full max-w-sm ">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">{t("errors.walletNotConnected")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm ">
      <CardHeader>
        <CardTitle className="text-center">{t("swap.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={mode} onValueChange={setMode}>
          <AnimatedTabsList className="w-full" activeValue={mode}>
            <AnimatedTabsTrigger value="buy" className="flex-1" layoutId={`swap-mode-${tokenConfig.key}`}>
              {t(tokenConfig.buyKey)}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger value="sell" className="flex-1" layoutId={`swap-mode-${tokenConfig.key}`}>
              {t(tokenConfig.sellKey)}
            </AnimatedTabsTrigger>
          </AnimatedTabsList>
        </Tabs>

        <Input
          type="number"
          min="0"
          placeholder={t("swap.amount")}
          aria-label={t("swap.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <AnimatePresence initial={false}>
          {parsedAmount && (
            <motion.div
              key="estimation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
              onAnimationComplete={() => { hasStaggered.current = true; }}
            >
              <div className="rounded-md border px-3 py-2 text-sm">
                {!estimation && estimationLoading ? (
                  <Skeleton className="h-4 w-full" />
                ) : estimation ? (
                  <EstimationRows
                    estimation={estimation}
                    mode={mode}
                    tokenConfig={tokenConfig}
                    animate={!hasStaggered.current}
                    t={t}
                  />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleSubmit}
          disabled={!amount || isPending}
        >
          {mode === "buy" ? t(tokenConfig.buyKey) : t(tokenConfig.sellKey)}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          {t("swap.gasDisclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
