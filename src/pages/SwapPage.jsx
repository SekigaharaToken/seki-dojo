import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AnimatedTabsList, AnimatedTabsTrigger } from "@/components/ui/animated-tabs.jsx";
import { PriceDisplay } from "@/components/swap/PriceDisplay.jsx";
import { SwapPanel } from "@/components/swap/SwapPanel.jsx";
import { BackSekiLink } from "@/components/layout/BackSekiLink.jsx";
import { SWAP_TOKENS } from "@/config/contracts.js";
import { fadeInUp, staggerDelay, tabContent } from "@/lib/motion.js";

export default function SwapPage() {
  const { t } = useTranslation();
  const [activeToken, setActiveToken] = useState(SWAP_TOKENS[0].key);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <motion.h1
        className="font-serif text-3xl font-bold"
        {...fadeInUp}
      >
        {t("swap.title")}
      </motion.h1>

      <motion.div
        className="w-full max-w-sm"
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, ...staggerDelay(1) }}
      >
        <Tabs value={activeToken} onValueChange={setActiveToken} className="w-full">
          <AnimatedTabsList className="w-full" activeValue={activeToken}>
            {SWAP_TOKENS.map((token) => (
              <AnimatedTabsTrigger
                key={token.key}
                value={token.key}
                className="flex-1"
                layoutId="swap-token-tab"
              >
                {token.label}
              </AnimatedTabsTrigger>
            ))}
          </AnimatedTabsList>

          <AnimatePresence mode="wait">
            {SWAP_TOKENS.map((token) =>
              token.key === activeToken ? (
                <TabsContent
                  key={token.key}
                  value={token.key}
                  className="flex flex-col items-center gap-6"
                  forceMount
                  asChild
                >
                  <motion.div
                    {...tabContent}
                    className="flex flex-col items-center gap-6"
                  >
                    <PriceDisplay tokenConfig={token} />
                    <SwapPanel tokenConfig={token} />
                  </motion.div>
                </TabsContent>
              ) : null
            )}
          </AnimatePresence>
        </Tabs>
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(2) }}>
        <BackSekiLink />
      </motion.div>
    </div>
  );
}
