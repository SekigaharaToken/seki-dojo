import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "@/hooks/useMiniAppContext.js";
import { APP_URL } from "@/config/constants.js";

export function useShareStreak({ currentStreak, currentTier }) {
  const { t } = useTranslation();
  const { isInMiniApp } = useMiniAppContext();

  const shareStreak = useCallback(async () => {
    const tierName = currentTier ? t(currentTier.nameKey) : "";
    const text = t("share.castText", { streak: currentStreak, tier: tierName });

    if (isInMiniApp) {
      await sdk.actions.composeCast({
        text,
        embeds: [APP_URL],
      });
    } else {
      const params = new URLSearchParams();
      params.set("text", text);
      params.append("embeds[]", APP_URL);
      window.open(`https://warpcast.com/~/compose?${params.toString()}`, "_blank");
    }
  }, [currentStreak, currentTier, isInMiniApp, t]);

  return { shareStreak };
}
