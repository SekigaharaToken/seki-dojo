import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { useClaim } from "@/hooks/useClaim.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Card showing weekly reward claim status and action.
 *
 * @param {{ distributionId: bigint|null, proof: string[], amount: string, tierName: string }} props
 */
export function ClaimCard({ distributionId, proof, amount, tierName }) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { claim, isClaimed, isPending } = useClaim({ distributionId, proof });

  return (
    <Card className="w-full max-w-sm animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-center">{t("rewards.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {!claim ? (
          <p className="text-muted-foreground">{t("rewards.noClaim")}</p>
        ) : isClaimed ? (
          <p className="font-semibold text-green-600" role="status">{t("rewards.claimed")}</p>
        ) : (
          <>
            <p className="text-lg font-bold">
              {t("rewards.claimable", { amount })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("rewards.tierEarned", { tier: tierName })}
            </p>
            <Button onClick={claim} disabled={isPending}>
              {t("rewards.claim")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
