import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StreakDisplay } from "@/components/dojo/StreakDisplay.jsx";
import { CheckInButton } from "@/components/dojo/CheckInButton.jsx";
import { CountdownTimer } from "@/components/dojo/CountdownTimer.jsx";
import { CheckInHistory } from "@/components/dojo/CheckInHistory.jsx";
import { ClaimCard } from "@/components/dojo/ClaimCard.jsx";
import { OnboardingOverlay } from "@/components/dojo/OnboardingOverlay.jsx";
import { ShareModal } from "@/components/dojo/ShareModal.jsx";
import { useOnboarding } from "@/hooks/useOnboarding.js";
import { useWalletAddress } from "@/hooks/useWalletAddress.js";
import { useStreak } from "@/hooks/useStreak.js";
import { useShareStreak } from "@/hooks/useShareStreak.js";

export default function HomePage() {
  const { t } = useTranslation();
  const onboarding = useOnboarding();
  const { address } = useWalletAddress();
  const { hasCheckedInToday, currentStreak, currentTier } = useStreak(address);
  const { shareStreak } = useShareStreak({ currentStreak, currentTier });

  const [shareOpen, setShareOpen] = useState(false);
  const prevCheckedIn = useRef(hasCheckedInToday);

  useEffect(() => {
    if (!prevCheckedIn.current && hasCheckedInToday) {
      setShareOpen(true);
    }
    prevCheckedIn.current = hasCheckedInToday;
  }, [hasCheckedInToday]);

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

      <h1 className="font-serif text-3xl font-bold">{t("app.name")}</h1>
      <p className="text-muted-foreground">{t("app.tagline")}</p>

      <StreakDisplay />

      <CheckInButton />

      <CountdownTimer />

      <ClaimCard
        distributionId={null}
        proof={[]}
        amount="0"
        tierName=""
      />

      <div className="w-full">
        <CheckInHistory />
      </div>

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
