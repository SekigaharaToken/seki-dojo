import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceDisplay } from "@/components/swap/PriceDisplay.jsx";
import { SwapPanel } from "@/components/swap/SwapPanel.jsx";
import { BackSekiLink } from "@/components/layout/BackSekiLink.jsx";
import { SWAP_TOKENS } from "@/config/contracts.js";

export default function SwapPage() {
  const { t } = useTranslation();
  const [activeToken, setActiveToken] = useState(SWAP_TOKENS[0].key);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="font-serif text-3xl font-bold">{t("swap.title")}</h1>

      <Tabs value={activeToken} onValueChange={setActiveToken} className="w-full max-w-sm">
        <TabsList className="w-full">
          {SWAP_TOKENS.map((token) => (
            <TabsTrigger key={token.key} value={token.key} className="flex-1">
              {token.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SWAP_TOKENS.map((token) => (
          <TabsContent key={token.key} value={token.key} className="flex flex-col items-center gap-6">
            <PriceDisplay tokenConfig={token} />
            <SwapPanel tokenConfig={token} />
          </TabsContent>
        ))}
      </Tabs>

      <BackSekiLink />
    </div>
  );
}
