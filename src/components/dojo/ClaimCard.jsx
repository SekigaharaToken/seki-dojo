import { useTranslation } from "react-i18next";
import { useWalletAddress, Card, CardContent, CardHeader, CardTitle, Button } from "@sekigahara/engine";
import { useClaim } from "@/hooks/useClaim.js";

/**
 * Card showing weekly reward claim status and action.
 *
 * @param {{ distributionId: bigint|null, proof: string[], amount: string, tierName: string, airdropUrl: string|null }} props
 */
export function ClaimCard({ distributionId, proof, amount, tierName, airdropUrl }) {
  const { t } = useTranslation();
  const { address } = useWalletAddress();
  const { claim, isClaimed, isPending } = useClaim({ distributionId, proof });

  return (
    <Card className="w-full max-w-sm">
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
        {airdropUrl && (
          <a
            href={airdropUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("rewards.viewAirdrop")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
