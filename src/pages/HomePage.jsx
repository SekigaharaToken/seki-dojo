import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { StreakDisplay } from "@/components/dojo/StreakDisplay.jsx";
import { CheckInButton } from "@/components/dojo/CheckInButton.jsx";
import { CountdownTimer } from "@/components/dojo/CountdownTimer.jsx";
import { CheckInHistory } from "@/components/dojo/CheckInHistory.jsx";
import { ClaimCard } from "@/components/dojo/ClaimCard.jsx";
import { OnboardingOverlay } from "@/components/dojo/OnboardingOverlay.jsx";
import { ShareModal } from "@/components/dojo/ShareModal.jsx";
import { useOnboarding } from "@/hooks/useOnboarding.js";
import { useWalletAddress, BackSekiLink, fadeInUp, staggerDelay } from "@sekigahara/engine";
import { useStreak } from "@/hooks/useStreak.js";
import { useShareStreak } from "@/hooks/useShareStreak.js";

export default function HomePage() {
  const { t } = useTranslation();
  const onboarding = useOnboarding();
  const { address } = useWalletAddress();
  const { hasCheckedInToday, currentStreak, currentTier } = useStreak(address);
  const { shareStreak } = useShareStreak({ currentStreak, currentTier });

  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {onboarding.shouldOnboard && (
        <OnboardingOverlay
          step={onboarding.step}
          startOnboarding={onboarding.startOnboarding}
          addApp={onboarding.addApp}
          claimWelcomeBonus={onboarding.claimWelcomeBonus}
          dismiss={onboarding.dismiss}
          isLoading={onboarding.isLoading}
          isConfirmed={onboarding.isConfirmed}
          error={onboarding.error}
        />
      )}

      <motion.h1
        className="font-serif text-3xl font-bold"
        {...fadeInUp}
      >
        {t("app.name")}
      </motion.h1>
      <motion.p
        className="text-muted-foreground"
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, ...staggerDelay(1) }}
      >
        {t("app.tagline")}
      </motion.p>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(2) }}>
        <StreakDisplay />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(3) }}>
        <CheckInButton onCheckInSuccess={() => setShareOpen(true)} />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(4) }}>
        <CountdownTimer />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(5) }}>
        <ClaimCard
          distributionId={null}
          proof={[]}
          amount="0"
          tierName=""
        />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(6) }}>
        <BackSekiLink />
      </motion.div>

      <motion.div
        className="w-full"
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, ...staggerDelay(7) }}
      >
        <CheckInHistory />
      </motion.div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        currentStreak={currentStreak}
        currentTier={currentTier}
        onShare={() => {
          shareStreak();
          setShareOpen(false);
        }}
      />
    </div>
  );
}
