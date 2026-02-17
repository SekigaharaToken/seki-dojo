import { useTranslation } from "react-i18next";
import { PriceDisplay } from "@/components/swap/PriceDisplay.jsx";
import { SwapPanel } from "@/components/swap/SwapPanel.jsx";
import { BackSekiLink } from "@/components/layout/BackSekiLink.jsx";

export default function SwapPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="font-serif text-3xl font-bold">{t("swap.title")}</h1>

      <PriceDisplay />

      <SwapPanel />

      <BackSekiLink />
    </div>
  );
}
