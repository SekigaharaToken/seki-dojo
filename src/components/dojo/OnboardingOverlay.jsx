import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, Gift, Bell } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";

/**
 * Full-screen onboarding overlay for first-time MiniApp users.
 * Steps: welcome → adding app → claiming bonus → done.
 */
export function OnboardingOverlay({
  step,
  startOnboarding,
  addApp,
  claimWelcomeBonus,
  dismiss,
  isLoading,
  isConfirmed,
  error,
}) {
  const { t } = useTranslation();

  // Auto-fire claim after app is added
  useEffect(() => {
    if (step === "claiming" && !isLoading && !isConfirmed) {
      claimWelcomeBonus();
    }
  }, [step, isLoading, isConfirmed, claimWelcomeBonus]);

  // Auto-start onboarding when component mounts
  useEffect(() => {
    if (step === "idle") {
      startOnboarding();
    }
  }, [step, startOnboarding]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-sm border-0 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          {/* Step 1: Welcome + Add App */}
          {(step === "idle" || step === "prompting") && (
            <>
              <div className="flex items-center gap-2">
                <Gift className="h-10 w-10 text-primary" />
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-2xl font-bold">
                {t("onboarding.welcomeTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("onboarding.welcomeDescription")}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={addApp}
              >
                {t("onboarding.addApp")}
              </Button>
              {error && (
                <p className="text-sm text-destructive">
                  {t("onboarding.addFailed")}
                </p>
              )}
            </>
          )}

          {/* Step 2: Adding app (in progress) */}
          {step === "adding" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="font-serif text-2xl font-bold">
                {t("onboarding.addingApp")}
              </h2>
            </>
          )}

          {/* Step 3: Claiming welcome bonus */}
          {step === "claiming" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="font-serif text-2xl font-bold">
                {t("onboarding.claimingBonus")}
              </h2>
              <p className="text-muted-foreground">
                {t("onboarding.claimingDescription")}
              </p>
              {error && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" onClick={claimWelcomeBonus}>
                    {t("onboarding.retry")}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 4: Success */}
          {step === "done" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="font-serif text-2xl font-bold">
                {t("onboarding.successTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("onboarding.successDescription")}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={dismiss}
              >
                {t("onboarding.startTraining")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
