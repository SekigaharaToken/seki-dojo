import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits, erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getCached, setCached } from "@/lib/immutableCache.js";

const ONE_TOKEN = parseUnits("1", 18);

function toPrice(value) {
  return parseFloat(formatUnits(value, 18));
}

const priceFormat = { minimumFractionDigits: 8, maximumFractionDigits: 8 };

function getAlertMessage({ mode, supplyIsZero, supplyIsMax, buyExceedsSupply, exceedsBalance, userBalance, sellAtLoss, t }) {
  const title = t("swap.swapWarningTitle");
  if (mode === "sell" && supplyIsZero) return { title, desc: t("swap.noSupply") };
  if (mode === "buy" && supplyIsMax) return { title, desc: t("swap.maxSupply") };
  if (buyExceedsSupply) return { title, desc: t("swap.exceedsSupply") };
  if (exceedsBalance) {
    const balance = parseFloat(formatUnits(userBalance, 18)).toFixed(2);
    return { title, desc: t("swap.exceedsBalance", { balance }) };
  }
  if (sellAtLoss) return { title, desc: t("swap.sellWarning") };
  return null;
}

function SwapAlert({ mode, supplyIsZero, supplyIsMax, buyExceedsSupply, exceedsBalance, userBalance, sellAtLoss, parsedAmount, estimation, estimationLoading, tokenConfig, hasStaggered, t }) {
  const alert = getAlertMessage({ mode, supplyIsZero, supplyIsMax, buyExceedsSupply, exceedsBalance, userBalance, sellAtLoss, t });
  const showAlert = alert && (parsedAmount || supplyIsZero || supplyIsMax);

  return (
    <AnimatePresence initial={false} mode="wait">
      {showAlert ? (
        <motion.div
          key="swap-alert"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>{alert.desc}</AlertDescription>
          </Alert>
        </motion.div>
      ) : parsedAmount ? (
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
      ) : null}
    </AnimatePresence>
  );
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
          <span className="font-mono tabular-nums"><NumberFlow value={toPrice(estimation.cost)} format={priceFormat} /></span> {tokenConfig.reserveLabel}
        </span>
      </Row>
      <Row className="flex justify-between" {...stagger(1)}>
        <span className="text-muted-foreground">{t("swap.fee")}</span>
        <span className="font-medium">
          <span className="font-mono tabular-nums"><NumberFlow value={toPrice(estimation.royalty)} format={priceFormat} /></span> {tokenConfig.reserveLabel}
        </span>
      </Row>
      <Row className="flex justify-between border-t pt-1" {...stagger(2)}>
        <span className="text-muted-foreground font-medium">
          {mode === "buy" ? t("swap.totalCost") : t("swap.receive")}
        </span>
        <span className="font-bold">
          <span className="font-mono tabular-nums"><NumberFlow value={toPrice(estimation.cost + estimation.royalty)} format={priceFormat} /></span> {tokenConfig.reserveLabel}
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

  // Current buy price for 1 token (shared cache with PriceDisplay)
  const { data: priceData } = useQuery({
    queryKey: ["tokenPrice", tokenConfig.address],
    queryFn: async () => {
      const [reserveAmount, royalty] = await token.getBuyEstimation(ONE_TOKEN);
      return { buyPrice: reserveAmount, royalty };
    },
    enabled: !!tokenConfig.address,
    staleTime: 10_000,
    retry: false,
  });

  // Token supply — maxSupply is immutable (cached), currentSupply is mutable
  const cacheKey = `tokenDetail:${tokenConfig.address}`;
  const cached = getCached(cacheKey);

  const { data: tokenDetail } = useQuery({
    queryKey: ["tokenDetail", tokenConfig.address],
    queryFn: async () => {
      if (cached) {
        // Only fetch mutable currentSupply
        const supply = await token.getTotalSupply();
        return { ...cached, currentSupply: supply };
      }
      const detail = await token.getDetail();
      const immutable = {
        maxSupply: String(detail.info.maxSupply),
        mintRoyalty: detail.mintRoyalty,
        burnRoyalty: detail.burnRoyalty,
      };
      setCached(cacheKey, immutable);
      return {
        ...immutable,
        currentSupply: detail.info.currentSupply,
      };
    },
    enabled: !!tokenConfig.address,
    staleTime: 10_000,
    retry: false,
  });

  const currentSupply = tokenDetail?.currentSupply ?? null;
  const maxSupply = tokenDetail?.maxSupply != null ? BigInt(tokenDetail.maxSupply) : null;

  // User's token balance (for sell validation)
  const { data: userBalance } = useReadContract({
    address: tokenConfig.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address && !!tokenConfig.address, staleTime: 10_000 },
  });

  // Edge cases
  const supplyIsZero = currentSupply != null && currentSupply === 0n;
  const supplyIsMax = currentSupply != null && maxSupply != null && currentSupply >= maxSupply;
  const buyExceedsSupply = mode === "buy"
    && parsedAmount
    && currentSupply != null
    && maxSupply != null
    && (currentSupply + parsedAmount > maxSupply);
  const exceedsBalance = mode === "sell" && parsedAmount && userBalance != null && parsedAmount > userBalance;

  // Detect if per-token sell refund is below the current buy price
  const buyPrice = priceData?.buyPrice;
  const sellAtLoss = mode === "sell"
    && estimation
    && parsedAmount
    && buyPrice != null
    && (estimation.cost * ONE_TOKEN / parsedAmount) < buyPrice;

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
      toast.success(t(mode === "buy" ? "toast.swapBuySuccess" : "toast.swapSellSuccess"));
      setAmount("");
    } catch {
      toast.error(t("toast.swapFailed"));
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

        <SwapAlert
          mode={mode}
          supplyIsZero={supplyIsZero}
          supplyIsMax={supplyIsMax}
          buyExceedsSupply={buyExceedsSupply}
          exceedsBalance={exceedsBalance}
          userBalance={userBalance}
          sellAtLoss={sellAtLoss}
          parsedAmount={parsedAmount}
          estimation={estimation}
          estimationLoading={estimationLoading}
          tokenConfig={tokenConfig}
          hasStaggered={hasStaggered}
          t={t}
        />

        <Button
          onClick={handleSubmit}
          disabled={
            !amount
            || isPending
            || (mode === "sell" && supplyIsZero)
            || (mode === "buy" && supplyIsMax)
            || buyExceedsSupply
            || exceedsBalance
            || sellAtLoss
          }
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
