import { useTranslation } from "react-i18next";
import { StreakDisplay } from "@/components/dojo/StreakDisplay.jsx";
import { CheckInButton } from "@/components/dojo/CheckInButton.jsx";
import { CountdownTimer } from "@/components/dojo/CountdownTimer.jsx";
import { CheckInHistory } from "@/components/dojo/CheckInHistory.jsx";
import { ClaimCard } from "@/components/dojo/ClaimCard.jsx";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-6 py-8">
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
    </div>
  );
}
