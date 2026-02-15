import { useTranslation } from "react-i18next";
import { useNetworkGuard } from "@/hooks/useNetworkGuard.js";
import { Button } from "@/components/ui/button.jsx";

/**
 * Shows a banner when the user is connected to the wrong network.
 */
export function NetworkGuardBanner() {
  const { t } = useTranslation();
  const { isWrongNetwork, switchToBase } = useNetworkGuard();

  if (!isWrongNetwork) return null;

  return (
    <div className="bg-destructive px-4 py-2 text-center text-destructive-foreground" role="alert">
      <span className="mr-2">{t("errors.networkError")}</span>
      <Button variant="secondary" size="sm" onClick={switchToBase}>
        {t("wallet.wrongNetwork")}
      </Button>
    </div>
  );
}
