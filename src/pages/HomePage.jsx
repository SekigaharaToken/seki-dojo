import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { StreakDisplay } from "@/components/dojo/StreakDisplay.jsx";
import { CheckInButton } from "@/components/dojo/CheckInButton.jsx";
import { CountdownTimer } from "@/components/dojo/CountdownTimer.jsx";
import { ClaimCard } from "@/components/dojo/ClaimCard.jsx";
import { OnboardingOverlay } from "@/components/dojo/OnboardingOverlay.jsx";
import { ShareModal } from "@/components/dojo/ShareModal.jsx";
import { useOnboarding } from "@/hooks/useOnboarding.js";
import { useWalletAddress, BackSekiLink, fadeInUp, staggerDelay } from "@sekigahara/engine";
import { useStreak } from "@/hooks/useStreak.js";
import { useShareStreak } from "@/hooks/useShareStreak.js";
import { useResolverEvents } from "@/hooks/useResolverEvents.js";
import { useActiveAirdrops } from "@/hooks/useActiveAirdrops.js";
import { STREAK_TIERS } from "@/config/constants.js";

export default function HomePage() {
  const { t } = useTranslation();
  const onboarding = useOnboarding();
  const { address } = useWalletAddress();
  const { hasCheckedInToday, currentStreak, currentTier } = useStreak(address);
  useResolverEvents();
  const airdrop = useActiveAirdrops();

  const [shareOpen, setShareOpen] = useState(false);
  // Fresh streak values from the check-in tx, used by ShareModal + cast composition
  const [shareData, setShareData] = useState(null);

  // Use shareData (from the just-completed tx) when available, so the cast
  // text uses the NEW streak — not the stale value from useStreak().
  const streakForShare = shareData?.currentStreak ?? currentStreak;
  const tierForShare = shareData?.currentTier ?? currentTier;
  const { shareStreak } = useShareStreak({ currentStreak: streakForShare, currentTier: tierForShare });

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
        <CheckInButton onCheckInSuccess={(result) => {
          setShareData(result);
          setShareOpen(true);
        }} />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(4) }}>
        <CountdownTimer />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(5) }}>
        <ClaimCard
          distributionId={airdrop.distributionId != null ? BigInt(airdrop.distributionId) : null}
          proof={airdrop.proof}
          amount={airdrop.reward ? String(airdrop.reward) : "0"}
          tierName={airdrop.tierId ? t(STREAK_TIERS.find((tier) => tier.id === airdrop.tierId)?.nameKey ?? "") : ""}
          airdropUrl={airdrop.airdropUrl}
        />
      </motion.div>

      <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, ...staggerDelay(6) }}>
        <BackSekiLink />
      </motion.div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        currentStreak={streakForShare}
        currentTier={tierForShare}
        onShare={() => {
          shareStreak();
          setShareOpen(false);
        }}
      />
    </div>
  );
}
